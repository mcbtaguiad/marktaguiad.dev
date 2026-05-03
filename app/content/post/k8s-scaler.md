---
title: "Kubernetes Autoscaling"
date: 2026-04-14
author: "Mark Taguiad"
tags: ["autoscaling", "kubernetes"]
UseHugoToc: true
weight: 2
---
{{< theme-image
light="/images/devops/k8s-notes/k8s-scale.png"
dark="/images/devops/k8s-notes/k8s-scale-dark.png"
alt="Architecture Diagram"
>}}

In Kubernetes, scaling is how you adjust your application to handle more or less traffic. There are two main types: `horizontal scaling` and `vertical scaling`.

# Table of Contents
{{< toc >}}

### Horizontal Scaling vs Vertical Scaling
| Feature  | Horizontal Scaling | Vertical Scaling            |
| -------- | ------------------ | --------------------------- |
| Method   | Add/remove pods    | Increase/decrease resources |
| Tool     | HPA                | VPA                         |
| Best for | Stateless apps     | Stateful or legacy apps     |
| Downtime | None               | Possible restart            |
| Limit    | Cluster size       | Node capacity               |


### Horizontal Scaling
This uses the `Horizontal Pod Autoscaler` to scale number of pods automatically.
- You increase the number of pod replicas.
- Traffic gets distributed across more pods.

HPA needs resource requests defined, make sure to add resource request and limit. 

*deploy.yaml*
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: nginx
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
```

*hpa.yaml*
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

Create and verify.
```bash
kubectl get hpa -n web
NAME          REFERENCE            TARGETS       MINPODS   MAXPODS   REPLICAS   AGE
web-app-hpa   Deployment/web-app   cpu: 0%/60%   2         8         2          2m7s
```
CPU is at 0% percent utilization so replicas is still at 2. If it goes beyond 60% then it will scale up (increase replicas).

### Vertical Scaling
This means increasing or decreasing resources of a single pod. You give a pod more CPU or RAM instead of adding more pods.

In-place pod resize graduates to stable in Kubernetes 1.35. Let's get into that, but let's first demonstraten the immutable version where pod are evicted and recreated when reach the resource limit. 

When the resource limit it reached:
- calculate new cpu/memory recommendation
- evict the running pod
- recreate pod with new updated resources

*deploy.yaml*
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: nginx
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
```

*vpa.yaml*
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name:  web-app-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: web-app
  updatePolicy:
    updateMode: "Auto"
```

In Kubernetes v1.35 there's no need to create VPA, just add `resizePolicy`.
- vpa monitor usage
- recommendeds better cpu/memory
- applies update
- no pod eviction and recreate

*deploy.yaml*
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: nginx
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
        resizePolicy:
        - resourceName: cpu
          restartPolicy: NotRequired
        - resourceName: memory
          restartPolicy: NotRequired
```
