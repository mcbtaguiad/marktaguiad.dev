---
layout: post
title: "Multi Network Pod with Multus in Kubernetes"
date: 2024-04-19
author: "Mark Taguiad"
tags: ["k3s", "devops", "multus"]
ShowToc: true
TocOpen: false
UseHugoToc: true
weight: 1
toc: false

TocOpen: false
---

# Multi Network Pod with Multus in Kubernetes
# Table of Contents
1. [Installation](#installation)
2. [Multus Manifest](#multus-manifest)
3. [Testing](#testing)


### Installation
> **Note**
> Check this website for more details or theory behind multus. (https://www.redhat.com/en/blog/using-the-multus-cni-in-openshift).

In this lab, we'll be using K3S as it is easy to setup and is production ready. First we would need to disabled flannel-backend, disable-network-policy to install CNI; calico or CNI of your choice. Optional to disble servicelb, unless you're implementing metallb. 
```bash 
$ curl -sfL https://get.k3s.io | K3S_KUBECONFIG_MODE="644" INSTALL_K3S_EXEC="--flannel-backend=none --cluster-cidr=192.168.0.0/16 --disable-network-policy --disable=traefik --disable servicelb" sh -
```

Install calico and multus. 
```bash
$ kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.3/manifests/calico.yaml
$ kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset-thick.yml
```

Check k8s status.
```sh
$ mcbtaguiad@tags-kvm-ubuntu:~$ kubectl get pods -A
NAMESPACE     NAME                                       READY   STATUS    RESTARTS      AGE
kube-system   kube-multus-ds-s7kgz                       1/1     Running   1 (50m ago)   6h32m
kube-system   calico-kube-controllers-787f445f84-kp274   1/1     Running   1 (50m ago)   6h35m
kube-system   coredns-6799fbcd5-hs547                    1/1     Running   1 (50m ago)   6h36m
kube-system   local-path-provisioner-6c86858495-svqw7    1/1     Running   1 (50m ago)   6h36m
kube-system   calico-node-5nx6b                          1/1     Running   1 (50m ago)   6h35m
kube-system   metrics-server-54fd9b65b-crfp7             1/1     Running   1 (50m ago)   6h36m
``` 
(Optional) Install CNI plugin. This might come in handy as you progress in exploring/implementing multus.

```sh
$ curl -s -L https://github.com/containernetworking/plugins/releases/download/v1.4.1/cni-plugins-linux-amd64-v1.4.1.tgz | tar xvz - -C /opt/cni/bin
```

### Multus Manifest
We're going to use macvlan. Use NIC used by K8S cluster, in my case I'm using `enp1s0`. A dhcp server is also setup in KVM, with IP pool from 192.168.122.201 to 192.168.122.254, this will be the IP that the pod can attach to.

```sh
mcbtaguiad@tags-kvm-ubuntu:/opt/cni$ ip r
default via 192.168.122.1 dev enp1s0 proto dhcp src 192.168.122.201 metric 100 
blackhole 172.16.58.128/26 proto bird 
172.16.58.133 dev cali205ed4120a1 scope link 
172.16.58.134 dev caliaeca16354bd scope link 
172.16.58.135 dev cali1a14292463c scope link 
172.16.58.136 dev cali93c699308e7 scope link 
192.168.122.0/24 dev enp1s0 proto kernel scope link src 192.168.122.201 metric 100 
192.168.122.1 dev enp1s0 proto dhcp scope link src 192.168.122.201 metric 100
```

Create network attachment definition (macvlan).

```bash
cat <<EOF > macvlan-net.yaml
apiVersion: "k8s.cni.cncf.io/v1"
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-net
spec:
  config: |
    {
      "name": "macvlan-net",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "cniVersion": "0.3.1",
          "type": "macvlan",
          "master": "enp1s0",
          "mode": "bridge",
          "ipam": {
            "type": "host-local",
            "subnet": "192.168.122.0/24",
            "rangeStart": "192.168.122.2",
            "rangeEnd": "192.168.122.254", 
            "routes": [
              {
                "dst": "0.0.0.0/0",
                "gw": "192.168.122.254"
              }
            ]
          }
        }
      ]
    }
EOF
kubectl create -f macvlan-net.yaml 
```

Create test pod/deployment. Add custom defined resources or annotation `k8s.v1.cni.cncf.io/networks: macvlan-net`.

```sh
cat <<EOF > test-multus.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-multus
spec:
  selector:
    matchLabels:
      app: test-multus
  replicas: 1
  template:
    metadata:
      labels:
        app: test-multus
      annotations:
        k8s.v1.cni.cncf.io/networks: macvlan-net
    spec:
      containers:
      - name: test-multus
        image: testcontainers/helloworld
        ports:
        - containerPort: 8080
        imagePullPolicy: IfNotPresent
        securityContext:
          privileged: true
EOF
kubectl create -f test-multus.yaml 
```

Get pod network status.
```bash
$ kubectl get pods
NAME                          READY   STATUS    RESTARTS   AGE
test-multus-868b8598b-t89g6   1/1     Running   0          2m36s

$ kubectl describe pod test-multus-868b8598b-t89g6
```

Pod attached to 192.168.122.2.

```yaml
Name:             test-multus-868b8598b-t89g6
Namespace:        default
Priority:         0
Service Account:  default
Node:             tags-kvm-ubuntu/192.168.122.201
Start Time:       Wed, 24 Apr 2024 11:28:34 +0000
Labels:           app=test-multus
                  pod-template-hash=868b8598b
Annotations:      cni.projectcalico.org/containerID: d43ea4cbd08d963167a7b53f5dd7a59fe95acd3e73f5bafb69f7345dcb3e1f82
                  cni.projectcalico.org/podIP: 172.16.58.137/32
                  cni.projectcalico.org/podIPs: 172.16.58.137/32
                  k8s.v1.cni.cncf.io/network-status:
                    [{
                        "name": "k8s-pod-network",
                        "ips": [
                            "172.16.58.137"
                        ],
                        "default": true,
                        "dns": {}
                    },{
                        "name": "default/macvlan-net",
                        "interface": "net1",
                        "ips": [
                            "192.168.122.2"
                        ],
                        "mac": "26:39:5a:00:db:60",
                        "dns": {},
                        "gateway": [
                            "192.168.122.254"
                        ]
                    }]
                  k8s.v1.cni.cncf.io/networks: macvlan-net
Status:           Running
IP:               172.16.58.137
IPs:
  IP:           172.16.58.137
Controlled By:  ReplicaSet/test-multus-868b8598b
Containers:
  test-multus:
    Container ID:   containerd://c84d601e64a094f8ae8a29c60440392054abe8c7f1ec491694bc08f8c4a2ada9
    Image:          testcontainers/helloworld
    Image ID:       docker.io/testcontainers/helloworld@sha256:4ee5a832ef6eee533df7224b80d4cceb9ab219599014f408d0b69690be94c396
    Port:           8080/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Wed, 24 Apr 2024 11:28:46 +0000
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-287fk (ro)
Conditions:
  Type                        Status
  PodReadyToStartContainers   True 
  Initialized                 True 
  Ready                       True 
  ContainersReady             True 
  PodScheduled                True 
Volumes:
  kube-api-access-287fk:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason          Age   From               Message
  ----    ------          ----  ----               -------
  Normal  Scheduled       26s   default-scheduler  Successfully assigned default/test-multus-868b8598b-t89g6 to tags-kvm-ubuntu
  Normal  AddedInterface  22s   multus             Add eth0 [172.16.58.137/32] from k8s-pod-network
  Normal  AddedInterface  22s   multus             Add net1 [192.168.122.2/24] from default/macvlan-net
  Normal  Pulling         22s   kubelet            Pulling image "testcontainers/helloworld"
  Normal  Pulled          14s   kubelet            Successfully pulled image "testcontainers/helloworld" in 7.796s (7.796s including waiting)
  Normal  Created         14s   kubelet            Created container test-multus
  Normal  Started         14s   kubelet            Started container test-multus

```

### Testing

Attach to the pod and we can verify that another network is attached `net1@tunl0` . 
```sh
$ kubectl exec -it test-multus-868b8598b-t89g6 -- ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: tunl0@NONE: <NOARP> mtu 1480 qdisc noop state DOWN qlen 1000
    link/ipip 0.0.0.0 brd 0.0.0.0
3: eth0@if10: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1480 qdisc noqueue state UP qlen 1000
    link/ether 7e:15:53:bb:6b:46 brd ff:ff:ff:ff:ff:ff
    inet 172.16.58.137/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::7c15:53ff:febb:6b46/64 scope link 
       valid_lft forever preferred_lft forever
4: net1@tunl0: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP 
    link/ether 26:39:5a:00:db:60 brd ff:ff:ff:ff:ff:ff
    inet 192.168.122.2/24 brd 192.168.122.255 scope global net1
       valid_lft forever preferred_lft forever
    inet6 fe80::2439:5aff:fe00:db60/64 scope link 
       valid_lft forever preferred_lft forever
```

Curl and ping the pod.

```sh
# test using the host network (kvm host)
$ mcbtaguiad@pop-os:~/develop$ ip r
default via 192.168.254.254 dev wlp4s0 proto dhcp metric 600 
169.254.0.0/16 dev virbr1 scope link metric 1000 linkdown 
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown 
172.18.0.0/16 dev br-f6e0458d2d6c proto kernel scope link src 172.18.0.1 linkdown 
192.168.100.0/24 dev virbr1 proto kernel scope link src 192.168.100.1 linkdown 
192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1 
192.168.254.0/24 dev wlp4s0 proto kernel scope link src 192.168.254.191 metric 600

# ping test
mcbtaguiad@pop-os:~/develop$ ping 192.168.122.2 -c5
PING 192.168.122.2 (192.168.122.2) 56(84) bytes of data.
64 bytes from 192.168.122.2: icmp_seq=1 ttl=64 time=0.314 ms
64 bytes from 192.168.122.2: icmp_seq=2 ttl=64 time=0.323 ms
64 bytes from 192.168.122.2: icmp_seq=3 ttl=64 time=0.389 ms
64 bytes from 192.168.122.2: icmp_seq=4 ttl=64 time=0.196 ms
64 bytes from 192.168.122.2: icmp_seq=5 ttl=64 time=0.151 ms

--- 192.168.122.2 ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4103ms
rtt min/avg/max/mdev = 0.151/0.274/0.389/0.087 ms

# curl test
$ mcbtaguiad@pop-os:~/develop$ curl 192.168.122.2:8080
<!doctype html>

<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Hello world</title>
    <style>
        body {
            font-family: sans-serif;
            max-width: 38rem;
            padding: 2rem;
            margin: auto;
        }

        * {
            max-width: 100%;
        }
    </style>
</head>

<body>
<h1>Hello world</h1>
<img src="logo.png" alt="Testcontainers logo"/>
<p>
    This is a test server used for Testcontainers' own self-tests. Find out more about this image on <a href="https://github.com/testcontainers/helloworld">GitHub</a>.
</p>
<p>
    Find out more about Testcontainers at <a href="https://www.testcontainers.org">www.testcontainers.org</a>.
</p>
<p>
    Hit <a href="/ping"><code>/ping</code></a> for a simple test response.
</p>
<p>
    Hit <a href="/uuid"><code>/uuid</code></a> for a UUID that is unique to this running instance of the container.
</p>
</body>
</html>
```
