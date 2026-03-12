---
title: "Kubernetes Notes - Controller"
date:  2026-03-06T12:15:40+08:00
author: "Mark Taguiad"
tags: ["k8s", "kubernetes", "pod", "replicaset", "controller"]
UseHugoToc: true
weight: 2
---
Kubernetes is designed to keep applications running even when failures occur. One of the key mechanisms that enables this is the Controller.

Controllers continuously monitor the cluster and ensure that the actual state matches the desired state. If something goes wrong, Kubernetes automatically corrects it.

This behavior is commonly referred to as self-healing.

It performs three main tasks:
- Observe the current state
- Compare it with the desired state
- Take action if they differ

This loop runs continuously inside the Kubernetes control plane.

# Table of Contents
{{< toc >}}
### Replicaset
A replicaset ensures that a specific number of pod replicas are always running.
#### Architecture
```bash
ReplicaSet
↓
Pods
```
#### Deploy
To better demonstrate controller let us deploy a replicaset. 

*replica.yaml*
```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: nginx-rs
spec:
  replicas: 3
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
Deploy and verify if pods are running. 
```bash
kubectl apply -f replica.yaml -n demo

kubectl get pods -n demo
NAME               READY   STATUS    RESTARTS   AGE
nginx-rs-4mbdt     1/1     Running   0          23s
nginx-rs-cn55j     1/1     Running   0          23s
nginx-rs-kdw67     1/1     Running   0          23s
```
We can see here that **three** replica pods are created. 
#### Self-Healing
One of Kubernetes most powerful features is its ability to automatically recover from failures. From the example earlier, we will delete a pod. 
```bash
kubectl delete pod nginx-rs-4mbdt -n demo
pod "nginx-rs-4mbdt" deleted from demo namespace
➜  k8s-demo kubectl get pods -n demo
NAME               READY   STATUS    RESTARTS   AGE
nginx-rs-cn55j     1/1     Running   0          2m53s
nginx-rs-kdw67     1/1     Running   0          2m53s
nginx-rs-stwqh     1/1     Running   0          5s
```
If the pod is managed by a controller, Kubernetes will automatically recreate a new pod to replace it. Because the desired state we specify is that **three** replicas must always be running. The controller detects the mismatch and restores the system.

#### Scaling
Replicaset can be scaled by editing your YAML file `replicas: 3` or by using `kubectl`.
```bash
kubectl scale --replica=5 replicaset/nginx-rs -n demo
replicaset.apps/nginx-rs scaled
```
Check latest update. 
```bash
kubectl get pods -n demo
NAME             READY   STATUS    RESTARTS   AGE
nginx-rs-657r5   1/1     Running   0          35s
nginx-rs-cn55j   1/1     Running   0          13m
nginx-rs-kdw67   1/1     Running   0          13m
nginx-rs-stwqh   1/1     Running   0          10m
nginx-rs-t974q   1/1     Running   0          35s
```
Now Kubernetes ensures **five** pods always exist.

### Advance Controller
Replicaset has a lot of limitation, it cannot handle rolling update, rollout and revision history. That is why this is rarely being used in production environment. Deployment, Statefulset, Daemonset and Job solves these limitation. Check the next part discussing more about these controllers. 

