---
title: "Kubernetes Daemonsets"
date: 2026-03-08
author: "Mark Taguiad"
tags: ["k8s", "kubernetes", "daemonsets"]
UseHugoToc: true
weight: 2
---
{{< theme-image
light="/images/devops/k8s-notes/k8s-notes-daemonset-001.png"
dark="/images/devops/k8s-notes/k8s-notes-daemonset-dark-001.png"
alt="Architecture Diagram"
>}}
Kubernetes has multiple controllers to manage workloads. So far, we’ve learned about Deployments and StatefulSets, which help run Pods that scale and keep state.
However, some workloads must run on every node in a cluster — this is where DaemonSets come in.

# Table of Contents
{{< toc >}}

### Why Daemonsets?
Most Kubernetes workloads (like Deployments) allow Pods to run anywhere in the cluster. But some software needs to be present on every node — regardless of what Pods are running there.

These workloads must run on each worker node so that:
- Logs are collected on every node
- Node metrics are gathered from each node
- Networking components operate cluster‑wide

### Example of Daemonsets Systems 
- Logging agents
- Monitoring agents
- Networking plugins
- Security tools

### Create Daemonsets
For this example let's run prometheus node exporter. This is ideal since we want an exporter on every node, even if we add a new node in the K8S Cluster a pod will automatically be created. 

But you can still use daemonset to deploy normal application like nginx, but this will be costly in resources - cause like we mentioned earlier pod is guaranteed to be created in each node. 
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/component: exporter
    app.kubernetes.io/name: node-exporter
  name: node-exporter
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: exporter
      app.kubernetes.io/name: node-exporter
  template:
    metadata:
      labels:
        app.kubernetes.io/component: exporter
        app.kubernetes.io/name: node-exporter
    spec:
      containers:
      - args:
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        - --no-collector.wifi
        - --no-collector.hwmon
        - --collector.filesystem.ignored-mount-points=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/pods/.+)($|/)
        - --collector.netclass.ignored-devices=^(veth.*)$
        name: node-exporter
        image: prom/node-exporter
        ports:
          - containerPort: 9100
            protocol: TCP
        volumeMounts:
        - mountPath: /host/sys
          mountPropagation: HostToContainer
          name: sys
          readOnly: true
        - mountPath: /host/root
          mountPropagation: HostToContainer
          name: root
          readOnly: true
      volumes:
      - hostPath:
          path: /sys
        name: sys
      - hostPath:
          path: /
        name: root
```
Verify.
```bash
kubectl get pods -n demo -o wide  
NAME                  READY   STATUS    RESTARTS      AGE     IP                NODE       NOMINATED NODE   READINESS GATES
node-exporter-7dk77   1/1     Running   0             26s     172.16.241.97     master01   <none>           <none>
node-exporter-9wqbj   1/1     Running   0             26s     172.16.59.227     master02   <none>           <none>
node-exporter-rnbbk   1/1     Running   0             26s     172.16.235.12     master03   <none>           <none>
```
Notice that a pod is created on each node of the cluster. 

### Service
Daemonset use service like we use in pods and deployment. You might me wondering how Prometheus will identify and differentiate the pod on the nodes. Prometheus doesn’t rely on unique Services per pod. It discovers individual pod endpoints and labels. 

Since pods run on different node, each pod has:
- pod
- node name
- pod name
- labels

Check endpoints.
```bash
kubectl get endpoints -n demo
NAME            ENDPOINTS                                                  AGE
node-exporter   172.16.235.12:9100,172.16.241.97:9100,172.16.59.227:9100   3s
```
Each target = different node metrics.

### Volume
Same with deployment. 

### Excluding Certain Nodes
You can prevent a DaemonSet from running on specific nodes. Note that is not exclusive to Daemonset, it is also applicable to other controller.
#### Node Taints
By default Control Plane Nodes are not schedulable - or simply cannot used to deploy pods. 

To make a node unschedulable using a taint, you add a taint that prevents pods from scheduling unless they have a matching toleration.
```bash
kubectl taint nodes <node-name> <key>=<value>:<effect>

# example

kubectl taint nodes master02 dedicated=experimental:NoSchedule
```
This means pods cannot be scheduled on master02 unless they tolerate `dedicated=experimental`.

To remove taint.
```bash
kubectl taint nodes master02 dedicated=experimental:NoSchedule-
```

#### Node Affinity & Labels
We can also label nodes and use affinity rules.

Let's demonstrate, first we label `master02` and `master03` with `monitor=prom`.
```bash
kubectl label nodes master02 monitor=prom
kubectl label nodes master03 monitor=prom
```

Edit daemonset YAML.
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/component: exporter
    app.kubernetes.io/name: node-exporter
  name: node-exporter
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: exporter
      app.kubernetes.io/name: node-exporter
  template:
    metadata:
      labels:
        app.kubernetes.io/component: exporter
        app.kubernetes.io/name: node-exporter
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: monitor
                operator: In
                values:
                - prom
      containers:
      - args:
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        - --no-collector.wifi
        - --no-collector.hwmon
        - --collector.filesystem.ignored-mount-points=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/pods/.+)($|/)
        - --collector.netclass.ignored-devices=^(veth.*)$
        name: node-exporter
        image: prom/node-exporter
        ports:
          - containerPort: 9100
            protocol: TCP
        volumeMounts:
        - mountPath: /host/sys
          mountPropagation: HostToContainer
          name: sys
          readOnly: true
        - mountPath: /host/root
          mountPropagation: HostToContainer
          name: root
          readOnly: true
      volumes:
      - hostPath:
          path: /sys
        name: sys
      - hostPath:
          path: /
        name: root
```
We added a affinity right after spec. 

Check running pods.
```bash
kubectl get pods -n demo -o wide
NAME                  READY   STATUS    RESTARTS      AGE     IP                NODE       NOMINATED NODE   READINESS GATES
node-exporter-lssxk   1/1     Running   0             69s     172.16.235.1      master03   <none>           <none>
node-exporter-wm26p   1/1     Running   0             69s     172.16.59.228     master02   <none>           <none>
```
Now only master02 and master03 has the pod.
{{< note >}}
Anti-affinity is not ignored, but this is irrelevant to Daemonset. I'll just put it here to complete discussion on pod scheduling.
{{< /note >}}
#### Anti-affinity
Avoid scheduling on the same node as other Pods. 
```bash
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - web
        topologyKey: "kubernetes.io/hostname"
```
- Prevents the Pod from being scheduled on a node that already has a Pod with `app=web`
- `topologyKey`: kubernetes.io/hostname ensures spreading across nodes

{{< note >}}
Node selector is ignored by daemonset. 
{{< /note >}}

#### Node Selector
Node Selector is the simplest way to schedule a Pod on specific nodes based on labels.
- Each node can have labels, e.g., `node-role=worker` or `env=production`
- Pods declare a `nodeSelector` to request nodes with matching labels
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: node-selector
spec:
  containers:
  - name: nginx
    image: nginx
  nodeSelector:
    env: production
```
The Pod will only be scheduled on nodes labeled `env=production`.

