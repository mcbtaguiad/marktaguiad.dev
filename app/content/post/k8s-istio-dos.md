---
title: "Istio: mTLS and RBAC"
date: 2026-03-24
author: "Mark Taguiad"
tags: ["k8s", "networking", "kubernetes", "istio", "security", "rbac", "mtls"]
UseHugoToc: true
weight: 2
---
Continuation of Kubernetes Istio, this time we'll focus on Security.
# Table of Contents
{{< toc >}}

### Security
#### mTLS (Mutual TLS)
This will ensure that service-to-service traffic is encrypted and authenticated.

Istio allows you to configure three main modes per namespace, workload, or globally:

| Mode           | Behavior                                                                       | When to Use                                                                                          |
| -------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **STRICT**     | Only allows **mTLS-encrypted traffic**. Plain HTTP connections are rejected. | Best for production when you want **full security** between services.                                |
| **PERMISSIVE** | Accepts both mTLS-encrypted and plain HTTP traffic.                          | Useful during **gradual migration** to mTLS. Old workloads can still communicate without encryption. |
| **DISABLE**    | Does not use mTLS at all.                                                    | For testing, legacy workloads, or non-critical traffic.                                              |

You might get confused with the HTTPS traffic, it just mean that all traffic are converted by istio envoy to mTLS. So as long as the request is going through first the sidecar then it is valid.

Let's demonstrate that here. Deploy `curl` pod in `universe` namespace and curl backend-v2 service.
```bash
kubectl create ns universe
kubectl run curl-test -n universe -it --rm --image=curlimages/curl -- sh

curl http://backend-v2.demo.svc.cluster.local:3000/api/version
{"version":"2.0.0"}
```
Now create `PeerAuthentication` manifest for mtls.

*mtls.yaml*
```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: demo-app-mtls
spec:
  mtls:
    mode: STRICT
```
```bash
kubectl create -f security/mtls.yaml -n demo
```
Verify mtls mode using `istioctl`, test on one of the running pod.
```bash
istioctl x describe pod backend-v1-8456d4864-h4fnm -n demo
Pod: backend-v1-8456d4864-h4fnm
   Pod Revision: default
   Pod Ports: 3000 (backend)
--------------------
Service: backend
   Port: http 3000/HTTP targets pod port 3000
--------------------
Service: backend-v1
   Port: http 3000/HTTP targets pod port 3000
--------------------
Effective PeerAuthentication:
   Workload mTLS mode: STRICT
Applied PeerAuthentication:
   demo-app-mtls.demo
```

Using the same curl pod, the request will **fail**.
```bash
kubectl run curl-test -n universe -it --rm --image=curlimages/curl -- sh

curl http://backend-v2.demo.svc.cluster.local:3000/api/version
curl: (56) Recv failure: Connection reset by peer
```
Next test is injecting sidecar to the namespace. 
```bash
kubectl label namespace universe istio-injection=enabled
```
Deploy `curl-test`.
```bash
kubectl run curl-test -n universe -it --rm --image=curlimages/curl -- sh
```
Verify, a istio sidecar pod is injected.
```bash
kubectl get pods -n universe
NAME        READY   STATUS    RESTARTS   AGE
curl-test   2/2     Running   0          10s
```
Now access backend-v2 service with curl with a sidecar.
```bash
curl http://backend-v2.demo.svc.cluster.local:3000/api/version
{"version":"2.0.0"}
```
Curl can access `backend-v2` service because request or traffic go through first the istio sidecar. 
#### AuthorizationPolicy (RBAC)
To make traffic more secure we can add `AutorozationPolicy`, this will limit even namespaces with istio sidecar injected.

Take note, this is dependent on `service account` and `matchLabels`. Review the content of `/kube` manifest.
```bash
kubectl get sa -n demo
NAME                     AGE
backend-sa               7h39m
default                  13h
demo-app-gateway-istio   62m
frontend-sa              7h39m
monitor-sa               7h39m
redis-sa                 7h39m
```

For this example let's limit access to backend, only monitor can only access backend

First lets create read access only. 

*rbac-read-monitor-to-backend.yaml*
```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: read-monitor-to-backend 
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: 
        - "cluster.local/ns/demo/sa/monitor-sa"
        - "cluster.local/ns/demo/sa/demo-app-gateway-istio"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths:
        - "/api/login"
        - "/api/version"
        - "/api/users"
        - "/api/users/*" # delete user
```
```bash
kubectl create -f security/mtls/rbac/rbac-read-monitor-to-backend.yaml -n demo
```
Verify on `http://192.168.254.221/app`.

{{< imageviewer folder="/images/devops/k8s-notes/istio/rbac-read-monitor" >}}

To make `frontend` and `monitor` have read/write access to `backend` add this new rule.

*rbac-readwrite-monitor-to-backend.yaml*
```yaml
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: read-write-monitor-to-backend 
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: 
        - "cluster.local/ns/demo/sa/monitor-sa"
        - "cluster.local/ns/demo/sa/demo-app-gateway-istio"
    to:
    - operation:
        methods: ["GET", "POST", "DELETE", "PUT"]
        paths:
        - "/api/login"
        - "/api/version"
        - "/api/users"
        - "/api/users/*" # delete user
```
```bash
kubectl create -f security/mtls/rbac/rbac-readwrite-monitor-to-backend.yaml -n demo
```
*rbac-read-frontend-to-backend.yaml*
```yaml
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: read-write-frontend-to-backend 
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: 
        - "cluster.local/ns/demo/sa/frontend-sa"
        - "cluster.local/ns/demo/sa/demo-app-gateway-istio"
    to:
    - operation:
        methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"]
        paths:
        - "/api/register"
        - "/api/login"
        - "/api/profile"
        - "/api/version"
        - "/api/users"
```
```bash
kubectl create -f security/mtls/rbac/rbac-readwrite-frontend-to-backend.yaml -n demo
```
