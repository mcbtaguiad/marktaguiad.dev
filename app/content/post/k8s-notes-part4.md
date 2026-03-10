---
title: "Kubernetes Notes - Volume"
date:  2026-03-06T03:32:32+08:00
author: "Mark Taguiad"
tags: ["k8s", "kubernetes", "volume", "csi"]
UseHugoToc: true
weight: 2
---
Containers in Kubernetes are ephemeral by default. This means that when a container stops or a Pod is deleted, any data stored inside the container filesystem is lost.

To solve this problem, Kubernetes provides Volumes, which allow data to persist and be shared between containers in a Pod.

Volumes are mounted into containers and provide persistent or shared storage depending on the type used.

{{< toc >}}

### How Volume Works 
Remember the first example we make, this time we will mount with different type of Kubernetes Volumes.

First let's demostrate how we declare a volume. 
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - mountPath: /usr/share/nginx/html
      name: web-data

  volumes:
  - name: web-data
    emptyDir: {}
```
- `volumes` defines the storage resource
- `volumeMounts` attaches the volume to the container
- `/usr/share/nginx/html` becomes backed by the volume
### Volume Types
#### emptyDir
emptyDir is a temporary volume created when a Pod starts. This is useful for caching and temporary files. 
- exists as long as the Pod runs
- deleted when the Pod is removed
```yaml
volumes:
- name: cache-volume
  emptyDir: {}
```
#### hostPath
`hostPath` mounts a directory from the host node filesystem into the Pod. Since it directly mount from the node the pod deployed to, the volume is not shared across pods/nodes.

Use this for development and testing.
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - mountPath: /usr/share/nginx/html
      name: web-data
    command: ["/bin/sh"]
      args:
        - -c
        - |
          echo "<html>\n<!-- <h2>  </h2> -->\n<h3>my first website</h3>\n<p>look at me mom i'm a devops.</p>" > /usr/share/nginx/html/index.html
          sleep 3600

  volumes:
  - name: web-data
    hostPath:
      path: /srv/k8s/host/
```
Check the node the pod deployed to and ssh.
```bash
NAME               READY   STATUS    RESTARTS   AGE    IP                NODE       NOMINATED NODE   READINESS GATES
nginx              1/1     Running   0          12s    172.16.235.62     master03   <none>           <none>

ssh master03
[mcbtaguiad@master03 ~]$ cat /srv/k8s/host/index.html 
<html>
<!-- <h2>  </h2> -->
<h3>my first website</h3>
<p>look at me mom i'm a devops.</p>
```
#### PersistentVolume (PV)
This is a cluster wide volume which persist even if the pod are deleted or restarted - unless intentionally deleted, becareful doing this in production. Unlike `hostPath`, `PV` is shared by pods bound to this volume. You'll need to create `PersistentVolumeClaim` to make pod/container consume the `PV`.  

`PVs` provide an abstraction layer over the actual underlying distributed storage systems -  using NFS-CSI, cloud provider or self-hosted solutions like Longhorn or Rook-Ceph (search more on this topic). I'll briefly explain this in the following section. 

Example PV:
```bash
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-storage
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
```
This is automatically created if you have deployed already a **Container Storage Interface (CSI)**. This will be requested and created by the `StorageClass` you defined or automatically created by the distributed storage system.

#### PersistentVolumeClaim (PVC)
A `PersistentVolumeClaim` (PVC) is a request for storage by a Pod. PVC will consume the PV resource created.

Instead of referencing a volume directly, Pods request storage through a claim.

For this example I'm using Rook-Ceph with `StorageClass` - rook-cephfs.
```bash
kubectl get storageclass
NAME                   PROVISIONER                     RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
rook-cephfs            rook-ceph.cephfs.csi.ceph.com   Delete          Immediate              true                   46s
```
*nginx.yaml*
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - mountPath: /usr/share/nginx/html
      name: web-data
    command: ["/bin/sh"]
    args:
      - -c
      - |
        echo "<html>\n<!-- <h2>  </h2> -->\n<h3>my first website</h3>\n<p>look at me mom i'm a devops.</p>" > /usr/share/nginx/html/index.html
        sleep 3600

  volumes:
  - name: web-data
    persistentVolumeClaim:
      claimName: nginx-pvc
```
The pod will stay in **Pending** state until the pvc manifest is created.

*pvc.yaml*
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nginx-pvc
spec: 
  storageClassName: rook-cephfs
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
```
Verify PVC and PV.
```bash
kubectl get pvc -n demo
NAME                  STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
nginx-pvc             Bound    pvc-1d381897-aa46-4475-88ce-f9c222613383   1Gi        RWX            rook-cephfs    <unset>                 7m41s
```
```bash
kubectl get pv 
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                      STORAGECLASS   VOLUMEATTRIBUTESCLASS   REASON   AGE
pvc-1d381897-aa46-4475-88ce-f9c222613383   1Gi        RWX            Delete           Bound    demo/nginx-pvc             rook-cephfs    <unset>                          3m41s
```
PVC is bound to the PV. 

### Persistent Storage Architecture
```bash
Pod
 ↓
PersistentVolumeClaim
 ↓
PersistentVolume
 ↓
Storage Backend (Disk / Cloud Storage / NFS)
```
### Container Storag Interface
Kubernetes Container Storage Interface (CSI) is a standardized interface enabling external storage systems to connect with Kubernetes, allowing for dynamic provisioning, volume snapshots, and mounting of persistent storage. 

Let's just deploy a simple CSI for this example - NFS-CSI. Unlike other CSI, this does not have backup and replication, Kubernetes access and manage NFS server for persistend storage. Don't use this in production.

Install NFS-CSI, check this [repo](https://github.com/kubernetes-csi/csi-driver-nfs) for more deployment option (helm).
```bash
curl -skSL https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/deploy/install-driver.sh | bash -s master --
Installing NFS CSI driver, version: master ...
serviceaccount/csi-nfs-controller-sa created
serviceaccount/csi-nfs-node-sa created
clusterrole.rbac.authorization.k8s.io/nfs-external-provisioner-role created
clusterrolebinding.rbac.authorization.k8s.io/nfs-csi-provisioner-binding created
clusterrole.rbac.authorization.k8s.io/nfs-external-resizer-role created
clusterrolebinding.rbac.authorization.k8s.io/nfs-csi-resizer-role created
csidriver.storage.k8s.io/nfs.csi.k8s.io created
deployment.apps/csi-nfs-controller created
daemonset.apps/csi-nfs-node created
NFS CSI driver installed successfully.

kubectl get pods -A | grep csi
kube-system      csi-nfs-controller-6c45446444-r5xc9                         5/5     Running     0               38s
kube-system      csi-nfs-node-bvfd5                                          3/3     Running     0               37s
kube-system      csi-nfs-node-pk6p9                                          3/3     Running     0               37s
kube-system      csi-nfs-node-qlzwd                                          3/3     Running     0               37s
```

Create `StorageClass`. 
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: 192.168.254.205
  share: /srv/nfs
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: Immediate
mountOptions:
  - hard
  - nfsvers=4.1
```
`reclaimPolicy` type:
- `Retain` - Keeps the volume after PVC deletion. Admin must manually delete or reuse it. Data is preserved.
- `Delete` - Automatically deletes the underlying storage (e.g., cloud disk) when PVC is deleted.

A NFS server is running in IP 192.168.254.205, make sure the K8S nodes are added in `/etc/exports`.

Using the example earlier just change `StorageClassName` to `nfs-csi`.
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nginx-pvc
spec: 
  storageClassName: nfs-csi
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
```
