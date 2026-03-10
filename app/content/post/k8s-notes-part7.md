---
title: "Kubernetes Notes - Statefulsets"
date: 2026-03-07
author: "Mark Taguiad"
tags: ["k8s", "kubernetes", "statefulsets"]
UseHugoToc: true
weight: 2
---
Kubernetes has several controllers to manage workloads. While Deployments are ideal for stateless applications, many real‑world use cases require stateful behavior — applications that store data, maintain identity, and rely on stable storage.

This is where StatefulSets come in. They provide stable identity, stable storage, and ordered deployment for stateful applications.
{{< toc >}}

### Why StatefulSets?
Stateless apps don’t care which instance serves a request. But stateful workloads often require:
- Persistent storage
- Stable network identity
- Ordered startup and teardown
- Consistent naming

Each Pod gets a sticky identity — persistent hostname and name. That's why this is usually used for **Database**, you can set the pods into replication setup. 

Pods identity survives restarts and rescheduling. Each Pod gets its own PersistentVolumeClaim (PVC) for storage. When a Pod is deleted or recreated, its associated storage remains intact.

### Examples of Stateful Systems
- Databases (PostgreSQL, MySQL)
- Message brokers (Kafka, RabbitMQ)
- Key‑value stores (Redis, Etcd)
- Search Engines

### Create Statefulset
*statefulset.yaml*
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
spec:
  serviceName: "postgresql"
  replicas: 3
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_PASSWORD
          value: "mypassword"
        volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: pgdata
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Gi
```
Check statefulset.
```bash
kubectl get statefulset -n demo
NAME         READY   AGE
postgresql   3/3     31m
```
Check the pods created by statefulset.
```bash
kubectl get pods -n demo
NAME           READY   STATUS    RESTARTS   AGE
postgresql-0   1/1     Running   0          31m
postgresql-1   1/1     Running   0          31m
postgresql-2   1/1     Running   0          30m
```
This verify that pod has controlled identity (pod names are stable), this allows applications to know exactly which instance they’re talking to.
### Service
Headless service is used for statefulset. Kubernetes does not allocate a single IP address, and kube-proxy does not handle the traffic - direct pod access. 

*svc-statefulset.yaml*
```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql
spec:
  clusterIP: None
  selector:
    app: postgresql
  ports:
    - port: 5432
      targetPort: 5432
```
Create the service.
```bash
kubectl apply -f svc-statefulset.yaml -n demo
```
The pods will get stable DNS names like:
```bash
postgresql-0.postgresql
postgresql-1.postgresql
postgresql-2.postgresql
```
Full DNS inside the cluster:
```bash
postgresql-0.postgresql.demo.svc.cluster.local
postgresql-1.postgresql.demo.svc.cluster.local
postgresql-2.postgresql.demo.svc.cluster.local
```
Verify this using the busybox pod in the universe namespace.
```bash
kubectl exec pod/busybox -n universe -- nslookup postgresql-0.postgresql.demo.svc.cluster.local
Server:		10.43.0.10
Address:	10.43.0.10:53


Name:	postgresql-0.postgresql.demo.svc.cluster.local
Address: 172.16.235.46

➜  k8s-demo kubectl exec pod/busybox -n universe -- nslookup postgresql-1.postgresql.demo.svc.cluster.local
Server:		10.43.0.10
Address:	10.43.0.10:53


Name:	postgresql-1.postgresql.demo.svc.cluster.local
Address: 172.16.59.219

➜  k8s-demo kubectl exec pod/busybox -n universe -- nslookup postgresql-2.postgresql.demo.svc.cluster.local
Server:		10.43.0.10
Address:	10.43.0.10:53

Name:	postgresql-2.postgresql.demo.svc.cluster.local
Address: 172.16.241.92
```

### Volume
`volumeClaimTemplates` allows each pod replica to automatically provision its own unique PersistentVolumeClaim (PVC).
```yaml
  volumeClaimTemplates:
  - metadata:
      name: pgdata
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Gi
```
Verify.
```bash
kubectl get pvc -n demo
NAME                  STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
pgdata-postgresql-0   Bound    pvc-e0ef97d6-0f66-496f-905b-7ad044c400a8   1Gi        RWO            local-path     <unset>                 3h37m
pgdata-postgresql-1   Bound    pvc-109e4724-e3eb-40f7-8352-11077972ad39   1Gi        RWO            local-path     <unset>                 3h37m
pgdata-postgresql-2   Bound    pvc-3b1664c1-e048-4458-bdf9-5d2be8eae5e8   1Gi        RWO            local-path     <unset>                 3h36m
```

Storage is persistent per pod. Even if a pod dies, its PVC remains. 

### Ordered Creation & Scaling
When applying statefulset, Kubernetes will create Pods in order.
```bash
app-0 ⇒ app-1 ⇒ app-2
```
If you scale up.
```bash
kubectl scale statefulset app --replicas=5
```
Pods are added one at a time from 3 to 4 to 5.

### Ordered Deletion
Deleting or scaling down also happens one at a time in reverse order:
```bash
app-4 ⇒ app-3 ⇒ app-2
```

This controlled sequence helps prevent data corruption in distributed systems.

