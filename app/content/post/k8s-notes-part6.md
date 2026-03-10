---
title: "Kubernetes Notes - Deployments"
date: 2026-03-06T23:07:51+08:00
author: "Mark Taguiad"
tags: ["k8s", "kubernetes", "deployments"]
UseHugoToc: true
weight: 2
---
In Kubernetes, ReplicaSets ensure that a specific number of Pods are always running. However, most real applications need to be updated frequently. This is where Deployments come in.

A Deployment is a higher-level Kubernetes resource that manages ReplicaSets and allows applications to be updated, scaled, and rolled back safely.
{{< toc >}}

### Why Deployment?
ReplicaSets ensure that the correct number of Pods are running, but they do not provide advanced update mechanisms.

Most applications require:
- version updates
- zero-downtime deployments
- rollback capability
- easy scaling

Deployments provide these features while still using ReplicaSets underneath.
#### Architecture
```bash
Deployment
    ↓
ReplicaSet
    ↓
Pods
    ↓
Containers
```
### Example of Deployment Systems 
- Web Applications
- REST APIs/Backend Services
- WebSocket
- Frontend Single Page Applications
### Create Deployment
*deployment.yaml*
```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx
```
Apply configuration.
```bash
kubectl apply -f deployment.yaml -n demo
```
Check the deployment.
```bash
kubectl get deployments -n demo     
NAME    READY   UP-TO-DATE   AVAILABLE   AGE
nginx   2/2     2            2           17s
```
Check the pod created by deployment.
```bash
kubectl get pods -n demo
NAME                     READY   STATUS    RESTARTS   AGE
nginx-56c45fd5ff-g48ls   1/1     Running   0          82s
nginx-56c45fd5ff-nf9xr   1/1     Running   0          82s
```
Notice that Pods receive random unique suffixes for identification within the cluster.

### Rolling Updates
Rolling updates allow Kubernetes to update applications gradually without downtime.

Update the container image, either by changing the image tag in the YAML file or by using `kubectl`.
```bash
kubectl set image deployment/nginx nginx=nginx:1.28 -n demo
```
Kubernetes will terminate and recreate new pods with the new image set. If the new image is not running or **unhealthy**, Kubernetes will not update the remaining replica until the first pod is healthy. 
```bash
k8s-demo kubectl get pods -n demo
NAME                     READY   STATUS              RESTARTS   AGE
nginx-56c45fd5ff-g48ls   1/1     Running             0          6m46s
nginx-56c45fd5ff-nf9xr   1/1     Running             0          6m46s
nginx-8874566fb-pxwbx    0/1     ContainerCreating   0          10s
➜  k8s-demo kubectl get pods -n demo
NAME                     READY   STATUS        RESTARTS   AGE
nginx-56c45fd5ff-g48ls   1/1     Terminating   0          6m47s
nginx-56c45fd5ff-nf9xr   1/1     Running       0          6m47s
nginx-8874566fb-nkr8f    0/1     Pending       0          0s
nginx-8874566fb-pxwbx    1/1     Running       0          11s
```
If you are using `latest` tags (this is not advisable in production environment), you need to trigger the rollout using this command. 
```bash
kubectl rollout restart deployment/nginx -n demo
```
This will check if new `latest` tag is pushed in the container registry, if true it will terminate and recreate the pods. 

### Rollbacks
Sometimes new versions introduce bugs, Kubernetes makes rollout extremely easy.
```bash
kubectl rollout history deployment/nginx -n demo
deployment.apps/nginx 
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
3         <none>
```
This will show the stored previous revision of deployment. 

Roll back to the previous version.
```bash
kubectl rollout undo deployment/nginx -n demo
deployment "nginx" successfully rolled out
```
Roll back to a specific version.
```bash
kubectl rollout undo deployment/nginx --to-revision=2 -n demo
deployment.apps/nginx rolled back
```
Check rollout status. 
```bash
kubectl rollout status deployment/nginx -n demo
deployment "nginx" successfully rolled out
```

