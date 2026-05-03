---
title: "Cilium Gateway API"
date: 2026-04-25
author: "Mark Taguiad"
tags: ["kubernetes", "networking", "cni", "gateway", "ebpf", "cilium"]
UseHugoToc: true
weight: 2
---
Cilium Gateway API support is a modern replacement for traditional Kubernetes Ingress controllers.

Instead of relying on standalone ingress proxies, Cilium integrates Gateway API directly into the networking stack using **eBPF** and **Envoy**, enabling:

- HTTP / HTTPS routing
- TLS passthrough
- TLS termination
- Traffic splitting
- Header manipulation
- Standards-based ingress with Kubernetes Gateway API

Cilium’s operator acts as the Gateway API controller and manages:

- `GatewayClass`
- `Gateway`
- `HTTPRoute`
- LoadBalancer Services
- eBPF traffic routing

This is similar with Istio Gateway, for our example let's use the same deployments/apps.

Repo: [mcbtaguiad/cilium-demo](https://github.com/mcbtaguiad/cilium-demo.git)

# Table of Contents
{{< toc >}}

### Install
#### Gateway API CRDs 
Apply the Experimental bundle, I encounter this error if I install the standard bundle.
```bash
kubectl logs -f cilium-operator-86b4d5df4f-2j76z -n kube-system
time=2026-04-27T22:32:11.412977005Z level=fatal msg="failed to start: failed to populate object graph: failed to create gateway controller: failed to setup reconciler: failed to setup field indexer \"backendServiceTLSRouteIndex\": no matches for kind \"TLSRoute\" in version \"gateway.networking.k8s.io/v1alpha2\""
```
Use Experimental bundle.
```bash
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/experimental-install.yaml
```

#### Enable Gateway API
I assume that you have cilium already installed.
```bash
cilium upgrage --set gatewayAPI.enabled=true
```
#### Verify
```bash
kubectl get gatewayclass
NAME     CONTROLLER                     ACCEPTED   AGE
cilium   io.cilium/gateway-controller   True       4m3s
```

### LoadBalancer Pool
Before we create the gateway, we need to create a LB pool that will attached to. 

Make sure this is enabled.
```bash
cilium upgrade \
  --set loadBalancerIPAM.enabled=true \
  --set l2announcements.enabled=true \
```

*lb-pool.yaml*
```yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: gateway-pool
spec:
  blocks:
    - start: 192.168.254.230
      stop: 192.168.254.230
  serviceSelector:
    matchLabels:
      io.cilium.gateway/owning-gateway: cilium-gateway
---
apiVersion: cilium.io/v2alpha1
kind: CiliumL2AnnouncementPolicy
metadata:
  name: l2-policy
spec:
  loadBalancerIPs: true
  externalIPs: true
```

### Gateway
Create gateway.

*gateway.yaml*
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: cilium-gateway
  namespace: demo
spec:
  gatewayClassName: cilium
  listeners:
    - name: http
      port: 80
      protocol: HTTP
```
Verify if it attached to the LB IP.
```bash
kubectl get svc -n demo | grep gateway
cilium-gateway-cilium-gateway   LoadBalancer   10.96.39.131     192.168.254.230   80:30439/TCP   35m
```
### Routing
This would enable the application route to the IP attached.  

*routing.yaml*
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: route-round-robin
  namespace: demo
spec:
  parentRefs:
    - name: cilium-gateway

  rules:
    # /api
    - matches:
        - path:
            type: PathPrefix
            value: /api/
      backendRefs:
        - name: backend
          port: 3000

    # /status
    - matches:
        - path:
            type: PathPrefix
            value: /status
      backendRefs:
        - name: monitor
          port: 8000

    # /app
    - matches:
        - path:
            type: PathPrefix
            value: /app
      backendRefs:
        - name: frontend
          port: 80
```
### Example Application
#### Deploy
Deploy the demo app.
```bash
cd cilium-demo
kubectl apply -k gateway-api/demo/environments/demo
```
Verify.
```bash
kubectl get pods -n demo
NAME                          READY   STATUS    RESTARTS   AGE
backend-v1-d4bd94b55-5pw7z    1/1     Running   0          90m
backend-v2-6ccc7d4644-pv6r2   1/1     Running   0          90m
frontend-6945d865bc-2kzvt     1/1     Running   0          90m
monitor-v1-66667767d4-6zb95   1/1     Running   0          90m
monitor-v2-6846bc5f87-zdgfp   1/1     Running   0          90m
redis-7849668f57-wj4jm        1/1     Running   0          90m
```
#### Test and Verify
Check screenshot below. 
{{< imageviewer folder="/images/devops/k8s-notes/cilium/gateway" >}}
