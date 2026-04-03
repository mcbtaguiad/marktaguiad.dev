---
title: "Istio: Fault Injection, Retries and Circuit Breaker"
date: 2026-03-28
author: "Mark Taguiad"
tags: ["k8s", "networking", "kubernetes", "istio", "security", "circuitbreaker"]
UseHugoToc: true
weight: 2
---

Continuation of Kubernetes Istio.

# Table of Contents
{{< toc >}}

I've mentioned in this [post](/post/k8s-istio-uno.md) that will sticking with `HTTPRoute`, but feature discussed here only support (for now) Istio API. 
### Gateway
This will attach to the `LoadBalancer` on namespace `istio-system`.
*demo-app-gateway.yaml*
```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: demo-app-gateway
  namespace: demo
spec:
  selector:
    istio: ingressgateway # use istio default controller
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*"
```
```bash
kubectl create -f routing/istio-api/demo-app-gateway.yaml -n demo
```
### Fault Injection
This is a good tool for testing resiliency on your application, but don't apply this on production. 

Review the manifest below. 

Logic:
- 50% chance → delayed by 2 seconds
- 50% chance → request is aborted (error returned)

*fault_injection.yaml*
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: round-robin-fault-injection
  namespace: demo
spec:
  hosts:
    - "*"
  gateways:
    - demo-app-gateway

  http:
    # /api
    - match:
        - uri:
            prefix: /api/
      fault:
        delay:
          fixedDelay: 2s
          percentage:
            value: 50
        abort:
          httpStatus: 401
          percentage:
            value: 50
      route:
        - destination:
            host: backend
            port:
              number: 3000

    # /status
    - match:
        - uri:
            prefix: /status
      fault:
        delay:
          fixedDelay: 2s
          percentage:
            value: 50
        abort:
          httpStatus: 500
          percentage:
            value: 50
      route:
        - destination:
            host: monitor
            port:
              number: 8000

    # /app
    - match:
        - uri:
            prefix: /app
      fault:
        delay:
          fixedDelay: 2s
          percentage:
            value: 50
        abort:
          httpStatus: 500
          percentage:
            value: 50
      route:
        - destination:
            host: frontend
            port:
              number: 80
```
```bash
kubectl create -f security/retries_circuitbreaker_faultinjection/fault_injection.yaml -n demo
```

#### Verify
Notice that the it has 2 second delay.
```bash
curl -s -o /dev/null -w "%{time_total}\\n" http://192.168.254.220/app
0.013159
curl -s -o /dev/null -w "%{time_total}\\n" http://192.168.254.220/app
2.008432
curl -s -o /dev/null -w "%{time_total}\\n" http://192.168.254.220/app
0.005950
curl -s -o /dev/null -w "%{time_total}\\n" http://192.168.254.220/app
2.004389
```
Now let's try to load access it consecutive times, it would return `fault filter abort`.
```bash
curl http://192.168.254.220/app
<html>
<head><title>301 Moved Permanently</title></head>
<body>
<center><h1>301 Moved Permanently</h1></center>
<hr><center>nginx/1.29.7</center>
</body>
</html>

curl http://192.168.254.220/app
fault filter abort% 

curl http://192.168.254.220/app
fault filter abort%
```
### Retries
This rule give the request multiple change to succeed but making sure to not connect to broken instances. 
*retries.yaml*
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: demo-app-retries
  namespace: demo
spec:
  host: backend
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 50
    retry:
      attempts: 3           # retry 3 times
      perTryTimeout: 2s     # each try max 2 seconds
      retryOn: gateway-error,connect-failure,refused-stream
```
```bash
kubectl create -f security/retries_circuitbreaker_faultinjection/retries.yaml -n demo
```
Allows up to 100 simultaneous TCP connections.
```
maxConnections: 100
```
50 requests can queue, each connection handles 10 requests before it got drop.
```
http1MaxPendingRequests: 50
maxRequestsPerConnection: 10
```
This is the core of the config:
- Istio will try up to 3 retries
- Each attempt can take max 2 seconds

Retries happen only for these failures:
- gateway-error → upstream returned 502/503/504
- connect-failure → cannot connect to backend
- refused-stream → connection-level issues (HTTP/2)
```
retry:
  attempts: 3
  perTryTimeout: 2s
  retryOn: gateway-error,connect-failure,refused-stream
```

### Circuit Breaker
Now lets add rule to not overload the pod and and temporary avoid bad pods. 
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: demo-app-circuit-breaker
  namespace: demo
spec:
  host: frontend
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10       # max 10 TCP connections
      http:
        http1MaxPendingRequests: 5
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 2s
      baseEjectionTime: 10s
      maxEjectionPercent: 50
```
```bash
kubectl create -f security/retries_circuitbreaker_faultinjection/circuit_breaker.yaml -n demo
```

Throttles how much traffic each frontend instance can handle. Only 10 active TCP connection per Envoy proxy to frontend instance.
```
tcp:
  maxConnections: 10
```

Max 5 queued requests waiting for a connection. If exceeded, requests are rejected (503). Each TCP connection can only handle 2 requests.
```
http:
  http1MaxPendingRequests: 5
  maxRequestsPerConnection: 2
```

This part removes unhealthy frontend pods automatically.
- If a frontend pod returns 3 errors in a row (5xx) - marked unhealthy.
- Health checks happen every 2 seconds.
- Bad pod is removed from load balancing for 10 seconds.
- At most 50% of frontend pods can be ejected.
```
outlierDetection:
  consecutive5xxErrors: 3
  interval: 2s
  baseEjectionTime: 10s
  maxEjectionPercent: 50
```
