---
title: "Kubernetes Metallb"
date: 2026-03-10T15:08:20+08:00
author: "Mark Taguiad"
tags: ["k8s", "metallb", "networking", "linux"]
UseHugoToc: true
weight: 2
---
{{< theme-image
light="/images/devops/k8s-notes/k8s-metallb-001.png"
dark="/images/devops/k8s-notes/k8s-metallb-dark-001.png"
alt="Architecture Diagram"
>}}
In cloud environments, Kubernetes provides external load balancing easily using Service type LoadBalancer, which integrates with cloud provider load balancers.

However, in bare-metal Kubernetes clusters, there is no built-in implementation for external load balancers. As a result, creating a LoadBalancer service would remain in a pending state.

MetalLB solves this problem by providing a network load balancer implementation for bare-metal Kubernetes clusters, allowing services to expose external IP addresses just like in cloud environments.

# Table of Contents
{{< toc >}}

### What is MetalLB?
MetalLB is a Kubernetes add-on that:
- Provides external IP addresses for services
- Implements LoadBalancer services in bare-metal 
- Integrates with standard networking protocols like ARP and BGP

It works by allocating IP addresses from a configured IP pool and announcing them to the network so external clients can reach the service.

### Architecture
#### Controller
Controller runs as a Deployment it watches Services and assigns IP addresses from the IP Pool. 

#### Speaker
Speaker runs as a DaemonSet on every node, it announces the assigned IPs to the network and handles traffic advertisement using ARP or BGP.

### Modes
I won't be tackling **BGP** Modes since I dont have a router that is BGP Capable (Cisco, Netgear, etc). We'll be focusing on **Layer 2** Mode. 

Layer 2 mode works by announcing the service IP using ARP or NDP on the local network.
- MetalLB selects a leader node
- That node advertises the service IP
- All incoming traffic goes to that node
- `kube-proxy` distributes the traffic to Pods

### Environment
#### Cluster
CNI network plugin is installed and CNI plugin is running on your cluster. If not check this [post](/post/k8s-notes-part3/#container-network-interface-cni).
#### Network
My setup is running on proxmox so by default a `bridge network` is already created. If you are using a laptop or a PC to test this, then create a bridge network and make sure you are using **Ethernet**. 

Create a bridge network, this will allow our VM to get IP from the router. 

I've already discussed this in previous post, check this [post](/post/linux-network/#bridges). Make sure to use the subnet your router is using.

### Deploy MetalLB
Check this [link](https://metallb.universe.tf/installation/) for other method of installation.
```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
```
Verify if pods are running.
```bash
 kubectl get pods -n metallb-system
NAME                          READY   STATUS    RESTARTS        AGE
controller-66bdd896c6-f64rg   1/1     Running   1 (41h ago)     4d19h
speaker-2zd5f                 1/1     Running   1 (4d14h ago)   4d19h
speaker-5qzvg                 1/1     Running   1 (41h ago)     4d19h
speaker-khhcx                 1/1     Running   2 (41h ago)     4d19h
```
### Configuration
Create your Metallb IP Pool. Add IP range your cluster can use in your network.

*metallb-pool.yaml*
```yaml
apiVersion: metallb.io/v1beta1
  kind: IPAddressPool
  metadata:
    name: metallb-ip-pool
    namespace: metallb-system
  spec:
    addresses:
      - "192.168.254.200-192.168.254.250"
```
Now we have 50 IPs allocatable to the Kubernetes Cluster. Take note of the `metadata` name. 

### Example
Let's create a pod, we'll use the pod we used in previous post. 

*pod.yaml*
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-demo
  labels:
    app: pod-demo
spec:
  containers:
    - name: pod1
      image: ubuntu
      volumeMounts:
        - name: queue
          mountPath: /usr/share/nginx/html
      command: ["/bin/sh"]
      args:
        - -c
        - |
          echo "<html>\n<!-- <h2>  </h2> -->\n<h3>my first website</h3>\n<p>look at me mom i'm a devops.</p>" > /usr/share/nginx/html/index.html
          sleep 3600

    - name: pod2
      image: nginx
      ports:
        - containerPort: 80
      volumeMounts:
        - name: queue
          mountPath: /usr/share/nginx/html

  volumes:
    - name: queue
      emptyDir: {}
```
```bash
kubectl create -f pod.yaml -n demo
```
#### Dynamic IP 
To use Metallb just add the metallb annotation. Also make sure your selector match with the pod label.

*srv-dynamic.yaml*
```yaml
apiVersion: v1
kind: Service
metadata:
  name: pod-demo-svc-dynamic
  labels:
    app: pod-demo-srv
  annotations:
    metallb.universe.tf/address-pool: metallb-ip-pool
  
spec:
  selector:
    app: pod-demo
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```

```bash
kubectl create -f srv-dynamic.yaml -n demo
```
Verify and curl the IP.
```bash
kubectl get svc -n demo
NAME                   TYPE           CLUSTER-IP     EXTERNAL-IP       PORT(S)        AGE
pod-demo-svc-dynamic   LoadBalancer   10.43.129.74   192.168.254.220   80:30080/TCP   21s

# test the IP
curl 192.168.254.220
<html>
<!-- <h2>  </h2> -->
<h3>my first website</h3>
<p>look at me mom i'm a devops.</p>
```
#### Static IP
Same same but not really, just add the annotaion below to make it static.

*nginx-svc-static.yaml*
```bash
apiVersion: v1
kind: Service
metadata:
  name: pod-demo-svc-static
  labels:
    app: pod-demo-svc-static
  annotations:
    metallb.universe.tf/address-pool: metallb-ip-pool
    metallb.io/loadBalancerIPs: 192.168.254.250
spec:
  selector:
    app: pod-demo
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```
```bash
kubectl create -f srv-static.yaml -n demo
```
```bash
kubectl get svc -n demo                       
NAME                   TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)        AGE
pod-demo-svc-dynamic   LoadBalancer   10.43.129.74    192.168.254.220   80:30080/TCP   5m37s
pod-demo-svc-static    LoadBalancer   10.43.234.111   192.168.254.250   80:31733/TCP   24s
```
Verify.
```bash
curl 192.168.254.250
<html>
<!-- <h2>  </h2> -->
<h3>my first website</h3>
<p>look at me mom i'm a devops.</p>
```
