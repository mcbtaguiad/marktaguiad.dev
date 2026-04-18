---
title: "Istio: A/B Testing and Canary Deployment"
date: 2026-04-03
author: "Mark Taguiad"
tags: ["kubernetes", "istio", "a/b testing", "deployment", "cicd", "testing"]
UseHugoToc: true
weight: 2
---
{{< theme-image
light="/images/devops/k8s-notes/istio/ab-testing/k8s-ab-testing-001.png"
dark="/images/devops/k8s-notes/istio/ab-testing/k8s-ab-testing-dark-001.png"
alt="Architecture Diagram"
>}}

A/B testing and Canary Deployment allows you to route traffic between different versions of your application to compare performance, behavior, or user experience.

With Istio, you can control traffic without changing application code—just by configuring the service mesh.

Replicate this using this [repo](https://github.com/mcbtaguiad/istio-demo).
```bash
kubectl apply -k kube/ab-testing/demo
```
# Table of Contents
{{< toc >}}

### A/B Testing vs Canary Deployment
| Aspect         | Canary Deployment    | A/B Testing            |
| -------------- | -------------------- | ---------------------- |
| Purpose        | Safe rollout         | Experimentation        |
| Traffic split  | Gradual (10% → 100%) | Fixed (often 50/50)    |
| Decision basis | Errors, latency      | User behavior, metrics |
| End goal       | Replace old version  | Pick best variant      |
| Versions       | Usually same feature | Different UX/features  |
### A/B Testing
#### Labels
Label your deployments properly.
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    version: v1
  name: monitor-v1
  namespace: demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: monitor
      version: v1
  template:
    metadata:
      labels:
        app: monitor
        version: v1
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    version: v2
  name: monitor-v2
  namespace: demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: monitor
      version: v2
  template:
    metadata:
      labels:
        app: monitor
        version: v2
```

#### Service
You can use one service like this. 
```yaml
apiVersion: v1
kind: Service
metadata:
  name: monitor
  namespace: demo
spec:
  ports:
  - name: http
    port: 8000
    targetPort: 8000
  selector:
    app: monitor
```
Or split it using v1 and v2. 
```yaml
apiVersion: v1
kind: Service
metadata:
  name: monitor-v1
  namespace: demo
spec:
  ports:
  - name: http
    port: 8000
    targetPort: 8000
  selector:
    app: monitor
    version: v1
```
```yaml
apiVersion: v1
kind: Service
metadata:
  name: monitor-v2
  namespace: demo
spec:
  ports:
  - name: http
    port: 8000
    targetPort: 8000
  selector:
    app: monitor
    version: v2
```
Either way would work but need to configure `DestinationRule`.


#### Destination Rule
This tells Istio about subsets (versions).
```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: monitor-destinationrule
  namespace: demo
spec:
  host: monitor
  subsets:
  - labels:
      version: v1
    name: v1
  - labels:
      version: v2
    name: v2
```
#### Virtual Service
Route traffic between versions.
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: route-ab-testing
  namespace: demo
spec:
  gateways:
  - demo-app-gateway
  hosts:
  - '*'
  http:
  - match:
    - uri:
        prefix: /status
    route:
    - destination:
        host: monitor
        port:
          number: 8000
        subset: v1
      weight: 50
    - destination:
        host: monitor
        port:
          number: 8000
        subset: v2
      weight: 50
```

#### Rollout Strategy
Unlike canary deployments, A/B testing keeps traffic split constant
(e.g., 50/50) to compare user behavior between versions.

#### Roll-back Strategy
If something goes wrong, change the weight of `version 2` to `0`. This will route all traffic to `version 1`.
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: route-ab-testing
  namespace: demo
spec:
  gateways:
  - demo-app-gateway
  hosts:
  - '*'
  http:
  - match:
    - uri:
        prefix: /status
    route:
    - destination:
        host: monitor
        port:
          number: 8000
        subset: v1
      weight: 100
    - destination:
        host: monitor
        port:
          number: 8000
        subset: v2
      weight: 0
```
### Canary Deployment
You can use the same manifest discussed in A/B Testing. Just change the rollout Strategy.

#### Rollout Strategy
| Stage   | v1   | v2   |
| ------- | ---- | ---- |
| Initial | 100% | 0%   |
| Test    | 90%  | 10%  |
| Expand  | 70%  | 30%  |
| Scale   | 50%  | 50%  |
| Final   | 0%   | 100% |

### Observe Metrics
Use Istio tools:
- Kiali → traffic visualization
- Prometheus → metrics
- Grafana → dashboards

Key things to monitor:
- Error rates
- Latency
- Request volume
- User behavior
