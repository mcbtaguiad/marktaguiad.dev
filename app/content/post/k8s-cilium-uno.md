---
title: "Cilium ClusterMesh: Connecting Kubernetes Clusters"
date: 2026-04-24
author: "Mark Taguiad"
tags: ["kubernetes", "networking", "cni", "kube-proxy", "ebpf", "cilium"]
UseHugoToc: true
weight: 2
---
Cilium is a Kubernetes CNI built on eBPF, replacing the traditional iptables-heavy networking model with kernel-level packet processing. Instead of relying on large iptables chains for routing, filtering, and service load balancing, Cilium injects eBPF programs directly into the Linux kernel datapath for lower latency and better scalability.

This would require a whole book in explaining eBPF, so we will not dwell in that. Let's focus first on connecting two Kubernetes Cluster. 
# Table of Contents
{{< toc >}}

### Why Cilium?
Cilium’s main architectural advantage is that it shifts networking and security enforcement from userspace and iptables into the kernel:
- eBPF dataplane: packet filtering, forwarding, NAT, and service LB happen in-kernel
- Identity-based security: policies are enforced on workload identity (labels) instead of only IP/CIDR
- Observability-first: Hubble exposes flow-level visibility without sidecars or packet mirroring
- kube-proxy replacement: service translation and load balancing can run entirely in eBPF
- Sidecar-free service mesh: optional L7 traffic management and mTLS without Envoy sidecars per pod

### Prerequisite
- Cluster
    - I'm using two K3S cluster, running on VM with bridge networking.
- Networking
    - Use bridge networking
    - We'll use Cilium `loadbalancer.IPAM` instead of `MetalLB`
    - Cluster A; **pod_cidr**: 10.42.0.0/16, **service_cidr**: 10.96.0.0/12
    - Cluster B; **pod_cidr**: 10.43.0.0/16, **service_cidr**: 10.97.0.0/12
- Merge K3S config/context
```bash
kubectl config get-contexts
CURRENT   NAME        CLUSTER     AUTHINFO    NAMESPACE
*         cluster-a   cluster-a   cluster-a   
          cluster-b   cluster-b   cluster-b
```
### Install Cilium
First install in `cluster-a`.
```bash
cilium install \
  --context cluster-a \
  --version 1.19.3 \
  --set kubeProxyReplacement=true \
  --set ipam.mode=cluster-pool \
  --set loadBalancerIPAM.enabled=true \
  --set cluster.name=cluster-a \
  --set cluster.id=1 \
  --set clusterPoolIPv4PodCIDR=10.42.0.0/16 \
  --set l2announcements.enabled=true \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution,icmp,http}"
```
Export `cluster-a` cilium certificate. Note that you can skip this but some feature would not work. Check warning below:
```bash
⚠️ Cilium CA certificates do not match between clusters. Multicluster features will be limited!
```
To export:
```bash
kubectl --context cluster-a get secret -n kube-system cilium-ca -o yaml > cilium-ca.yaml
sed -i '/resourceVersion/d;/uid/d;/creationTimestamp/d' cilium-ca.yaml
```
Now apply certifcate in `cluster-b`.
```bash
kubectl --context cluster-b create -f cilium-ca.yaml -n kube-system 
```
Install Cilium in `cluster-b`.
```bash
cilium install \
  --context cluster-b \
  --version 1.19.3 \
  --set kubeProxyReplacement=true \
  --set ipam.mode=cluster-pool \
  --set loadBalancerIPAM.enabled=true \
  --set cluster.name=cluster-b \
  --set cluster.id=2 \
  --set clusterPoolIPv4PodCIDR=10.43.0.0/16 \
  --set l2announcements.enabled=true \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution,icmp,http}"
```
### LoadBalancer Pool
#### ClusterMesh
You can create a one pool for both cluster or separate the pool for the cluster mesh. 

I go with the latter, first create the clustermesh IP pool.

*cluster-pool-a-lb.yaml*
```yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: cluster-pool
spec:
  blocks:
    - start: 192.168.254.220
      stop: 192.168.254.220
---
apiVersion: cilium.io/v2alpha1
kind: CiliumL2AnnouncementPolicy
metadata:
  name: l2-policy
spec:
  loadBalancerIPs: true
  externalIPs: true
```
*cluster-pool-b-lb.yaml*
```yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: cluster-pool
spec:
  blocks:
    - start: 192.168.254.221
      stop: 192.168.254.221
---
apiVersion: cilium.io/v2alpha1
kind: CiliumL2AnnouncementPolicy
metadata:
  name: l2-policy
spec:
  loadBalancerIPs: true
  externalIPs: true
```
Apply clustermesh IP pool.
```bash
kubectl --context cluster-a create -f cluster-pool-a-lb.yaml
kubectl --context cluster-b create -f cluster-pool-b-lb.yaml
```

#### App pool
Create also IP pool for app that will be deployed in the cluster. 

*app-lb-pool-a.yaml*
```yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: app-pool
spec:
  blocks:
    - start: 192.168.254.230
      stop: 192.168.254.239
  serviceSelector:
    matchLabels:
      lb-pool: app
```
*app-lb-pool-b.yaml*
```yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: app-pool
spec:
  blocks:
    - start: 192.168.254.240
      stop: 192.168.254.249
  serviceSelector:
    matchLabels:
      lb-pool: app
```
Apply app IP pool.
```bash
kubectl --context cluster-a create -f app-lb-pool-a.yaml
kubectl --context cluster-b create -f app-lb-pool-b.yaml
```
### ClusterMesh
#### Enable ClusterMesh
We're gonna be using `service-type` LoadBalancer, you can also set it to NodePort.
```bash
cilium --context cluster-a clustermesh enable --service-type LoadBalancer
cilium --context cluster-b clustermesh enable --service-type LoadBalancer
```
`clustermesh` pod will be init state as we need still need to connect the clusters. 
```bash
kubectl --context cluster-a get pods -n kube-system 
NAMESPACE     NAME                                                    READY   STATUS      RESTARTS   AGE
kube-system   cilium-bkv2p                                            1/1     Running     0          10m
kube-system   cilium-envoy-fmphf                                      1/1     Running     0          10m
kube-system   cilium-envoy-fqw6f                                      1/1     Running     0          10m
kube-system   cilium-envoy-k5r62                                      1/1     Running     0          10m
kube-system   cilium-g9mtc                                            1/1     Running     0          10m
kube-system   cilium-lglld                                            1/1     Running     0          10m
kube-system   cilium-operator-5784844fd8-mx4wl                        1/1     Running     0          10m
kube-system   clustermesh-apiserver-6f7f876799-j89jz                  0/3     Init:0/1    0          117s
kube-system   clustermesh-apiserver-generate-certs-08c2b7ed3e-24plq   0/1     Completed   0          117s
kube-system   coredns-7566b5ff58-mc2j8                                1/1     Running     0          9m55s
kube-system   local-path-provisioner-6bc6568469-7vdj8                 1/1     Running     0          147m
kube-system   metrics-server-786d997795-l6wkf                         0/1     Running     0          21s
```

#### Connect the Cluster
Run this once on `cluster-a`.
```bash
cilium clustermesh connect --context cluster-a --destination-context cluster-b

✨ Extracting access information of cluster cluster-a...
🔑 Extracting secrets from cluster cluster-a...
ℹ️  Found ClusterMesh service IPs: [192.168.254.220]
✨ Extracting access information of cluster cluster-b...
🔑 Extracting secrets from cluster cluster-b...
ℹ️  Found ClusterMesh service IPs: [192.168.254.221]
ℹ️ Configuring Cilium in cluster cluster-a to connect to cluster cluster-b
ℹ️ Configuring Cilium in cluster cluster-b to connect to cluster cluster-a
✅ Connected cluster cluster-a <=> cluster-b!
```

Verify.
```bash
cilium cilium --context cluster-a clustermesh status

✅ Service "clustermesh-apiserver" of type "LoadBalancer" found
✅ Cluster access information is available:
  - 192.168.254.220:2379
✅ Deployment clustermesh-apiserver is ready
ℹ️  KVStoreMesh is enabled

✅ All 3 nodes are connected to all clusters [min:1 / avg:1.0 / max:1]
✅ All 1 KVStoreMesh replicas are connected to all clusters [min:1 / avg:1.0 / max:1]

🔌 Cluster Connections:
  - cluster-b: 3/3 configured, 3/3 connected - KVStoreMesh: 1/1 configured, 1/1 connected
```
Troubleshooting; you'll get this error if both clustermesh attached to the same IP.
```bash
ilium --context cluster-a clustermesh status
✅ Service "clustermesh-apiserver" of type "LoadBalancer" found
✅ Cluster access information is available:
  - 192.168.254.220:2379
✅ Deployment clustermesh-apiserver is ready
ℹ️  KVStoreMesh is enabled

⚠️  3/3 nodes are not connected to all clusters [min:0 / avg:0.0 / max:0]
⚠️  1/1 KVStoreMesh replicas are not connected to all clusters [min:0 / avg:0.0 / max:0]

🔌 Cluster Connections:
  - cluster-b: 3/3 configured, 0/3 connected - KVStoreMesh: 1/1 configured, 0/1 connected

❌ 4 Errors:
  ❌ cilium-6zzjf is not connected to cluster cluster-b: remote cluster configuration required but not found
     💡 This is likely caused by KVStoreMesh not being connected to the given cluster
  ❌ cilium-gk2m5 is not connected to cluster cluster-b: remote cluster configuration required but not found
     💡 This is likely caused by KVStoreMesh not being connected to the given cluster
  ❌ cilium-kz4ls is not connected to cluster cluster-b: remote cluster configuration required but not found
     💡 This is likely caused by KVStoreMesh not being connected to the given cluster
  ❌ clustermesh-apiserver-566589c7bd-8wjp2 is not connected to cluster cluster-b: remote cluster configuration required but not found
     💡 Double check if the cluster name matches the one configured in the remote cluster
```

### Failover Example
#### Deployment
Let's first deploy an application in both cluster. Create `echo` namespace.
```bash
kubectl --contect cluster-a create ns echo
kubectl --contect cluster-b create ns echo
```
We use different image tag to easily differentiate the cluster deployment. 
- cluster-a
- cluster-b

*echo-deploy-a.yaml*
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: echo
  name: echo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: echo
  template:
    metadata:
      labels:
        app: echo
    spec:
      containers:
      - name: echo
        image: mcbtaguiad/web-echo:cluster-a
        imagePullPolicy: Always
        ports:
        - containerPort: 80
      restartPolicy: Always
```
Apply in `cluster-a`.
```bash
kubectl --contect cluster-a apply -f echo-deploy-a.yaml -n echo
```

*echo-deploy-b.yaml*
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: echo
  name: echo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: echo
  template:
    metadata:
      labels:
        app: echo
    spec:
      containers:
      - name: echo
        image: mcbtaguiad/web-echo:cluster-b
        imagePullPolicy: Always
        ports:
        - containerPort: 80
      restartPolicy: Always
```
Apply in `cluster-b`.
```bash
kubectl --contect cluster-b apply -f echo-deploy-b.yaml -n echo
```
#### Global Service
Create a `global service` in both cluster.

*global-service.yaml*
```yaml
apiVersion: v1
kind: Service
metadata:
  name: echo
  labels:
    lb-pool: app
  annotations:
    service.cilium.io/global: "true"
    service.cilium.io/affinity: "local"
spec:
  type: LoadBalancer
  loadBalancerClass: io.cilium/l2-announcer
  selector:
    app: echo
  ports:
    - port: 80
      targetPort: 80
```
Appy on `cluster-a` and `cluster-b`.
```bash
kubectl --contect cluster-a apply -f global-service.yaml 
kubectl --contect cluster-b apply -f global-service.yaml 
```

This Service combines two layers of failover:
- Layer 1 — External VIP failover
    - Cilium L2 Announcer ensures the LoadBalancer IP remains reachable on the LAN by moving VIP ownership between nodes if needed.
- Layer 2 — Cross-cluster backend failover
    - ClusterMesh ensures requests can still be served by remote cluster endpoints if the local cluster has no healthy pods.

Other configuration:
| Annotation                             | Use Case                       | Behavior                                                                                                                         |
| -------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `service.cilium.io/global: "true"`     | Basic service export           | Exposes the service across the ClusterMesh and distributes traffic across all participating clusters.                            |
| `service.cilium.io/affinity: "local"`  | Latency / cost optimization    | Prefers endpoints in the local cluster and only forwards to remote clusters when no local endpoints are available.               |
| `service.cilium.io/affinity: "remote"` | Maintenance / traffic shifting | Prioritizes remote cluster endpoints, allowing traffic to be drained away from the local cluster during upgrades or maintenance. |
| `service.cilium.io/shared: "false"`    | Service isolation              | Keeps the service local to the cluster by preventing its endpoints from being advertised to other clusters in the mesh.          |

With `loadBalancerClass: io.cilium/l2-announcer`,Cilium advertises the Service VIP directly on the local Layer 2 network using ARP/NDP.
```bash
kubectl --context cluster-a get svc -n echo                     
NAME   TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)        AGE
echo   LoadBalancer   10.111.71.163   192.168.254.230   80:31515/TCP   23h

kubectl --context cluster-b get svc -n echo
NAME   TYPE           CLUSTER-IP     EXTERNAL-IP       PORT(S)        AGE
echo   LoadBalancer   10.96.201.70   192.168.254.240   80:31837/TCP   23h
```
Verify
```bash
curl 192.168.254.230                       
<html>
<!-- <h2>  </h2> -->
<h3>Cluster A</h3>
<p>Look at me Mom, I'm a DevOps.</p>

curl 192.168.254.240
<html>
<!-- <h2>  </h2> -->
<h3>Cluster A</h3>
<p>Look at me Mom, I'm a DevOps.</p>

```
#### Failover
Scale down `echo` pod in `cluster-b`.
```bash
kubectl --context cluster-b scale deployment/echo --replicas=0 -n echo
deployment.apps/echo scaled
```
Curl IP of `echo` pod in `cluster-b`. This should still work but response should come from `cluster-a`.
```bash
curl 192.168.254.240
<html>
<!-- <h2>  </h2> -->
<h3>Cluster A</h3>
<p>Look at me Mom, I'm a DevOps.</p>
```
