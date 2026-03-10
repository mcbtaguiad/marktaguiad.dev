---
title: "Kubernetes Notes - Networking"
date:  2026-03-05T23:54:49+08:00
author: "Mark Taguiad"
tags: ["k8s", "kubernetes", "networking", "cni"]
UseHugoToc: true
weight: 2
---
For applications running inside Kubernetes to function correctly, they must be able to communicate with each other and with external systems. Kubernetes provides a networking model that enables communication between Pods, Services, and external clients.

# Table of Contents
{{< toc >}}
### Pod Internal
Each Pod receives its own internal IP address inside the Kubernetes cluster. This allows Pods to communicate directly with each other using that IP. 

Let's spin up a pod to demonstrate. 
```bash
kubectl run nginx --image=nginx -n demo
pod/nginx created
```
Get the IP of the pod.
```bash
kubectl describe pod/nginx -n demo | grep IP:
                  cni.projectcalico.org/podIP: 172.16.235.48/32
IP:               172.16.235.48
  IP:  172.16.235.48
```
Pods are ephemeral, if a Pod is restarted or replaced, its IP may change. Because of this, applications should not rely on Pod IP addresses directly. Kubernetes solves this with **Services**.

### Services
Instead of connecting directly to Pod IPs, clients communicate with a Service IP, and Kubernetes forwards the traffic to the appropriate Pods.

#### Create Using YAML
Make sure to check the label and selector on the pod created earlier using. 
```bash
kubectl describe pod/nginx -n demo

# or
kubectl get pods --show-labels -n demo
NAME           READY   STATUS    RESTARTS   AGE    LABELS
nginx          1/1     Running   0          26m    run=nginx
```
Or just redeploy the pod with your own label and selector.

*svc-nginx.yaml*
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: demo
spec:
  selector:
    run: nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```
Important note is that you should always point the `targetPort` to the image exposed port. `port` can be set to anyport, this is also inherited by `LoadBalancer` and `Ingress` when exposing outside the Cluster.  

```bash
kubectl create -f srv-nginx.yaml
```
#### Create using kubectl
```bash
kubectl expose pod nginx \ 
  --name=nginx \ 
  --type=LoadBalancer \
  --port=80 \
  -n demo
service/nginx exposed
```
#### Verify
Check service created. Usually pod don't get assign **External-IP** if Metallb is not configured or a Ingress Controller is configured - I'll discuss this on another post. 
```bash
kubectl get svc -n demo
NAME    TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)        AGE
nginx   LoadBalancer   10.43.152.217   192.168.254.220   80:32311/TCP   8s
```
Now Pods can access the service using this stable IP. 

Let's spin another pods to access the pod using its IP, make sure it is running in the same **Namespace**. Also make it run in infinite. 
```bash
kubectl run busybox --image=busybox -n demo -- sleep infinity
```
Exec into the pod and wget the the IP.
```bash
kubectl exec pod/busybox -n demo -- wget -q -O -  10.43.152.217
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

### Service DNS
Kubernetes automatically creates internal DNS entries for Services. Instead of remembering IP addresses, services can be accessed using DNS.

Format:
```bash
service-name.namespace.svc.cluster.local
```
For the nginx service we created, it is formatted like this:
```bash
nginx.demo.svc.cluster.local
```
#### Same Namespace
Now using the same example earlier, we'll access the pod using Service DNS this time.
```bash
kubectl exec pod/busybox -n demo -- wget -q -O - nginx.demo.svc
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```
Notice that I only use `nginx.demo.svc`, this is valid because both pod are using the same **namespace**. 
#### Cluster Wide
Let's access nginx pod inside demo namespace in a different namespace, let's call it **universe**.

Deploy busybox in universe namespace.
```bash
kubectl create ns universe
namespace/universe created

kubectl run busybox --image=busybox -n universe -- sleep infinity
pod/busybox created
```
```bash
kubectl exec pod/busybox -n universe -- wget -q -O - nginx.demo.svc.cluster.local
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```
### Service Types
Kubernetes supports different Service types depending on how the application should be accessed.

#### ClusterIP (Default)
ClusterIP exposes a Service inside the cluster only. Used for internal communication between microservices.
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: demo
spec:
  selector:
    run: nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP

```
#### NodePort
A NodePort Service exposes the application on a port of every node in the cluster. NodePort allows external access but requires knowing the node IP and port.

Port range:
```
30000 – 32767
```
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: demo
spec:
  selector:
    run: nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
      nodePort: 30080
  type: NodePort
```
To test curl the nodeport on one of the node. 
```bash
curl localhost:30080 
```
#### LoadBalancer
A LoadBalancer Service creates an external load balancer through the cloud provider or metallb. This is the type we used in the example. 
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: demo
spec:
  selector:
    run: nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```
```bash
kubectl get svc -n demo
NAME    TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)        AGE
nginx   LoadBalancer   10.43.152.217   192.168.254.220   80:32311/TCP   8s
```
To test, curl on the external IP the pod attached to.
```bash
curl 192.168.254.220
```

### hostPort and hostNetwork
 By using `hostPort` and `hostNetwork`, you are attaching the pod directly to your Node ports. 

Their difference is that `hostPort` still need to communicate with Kubernetes CNI plugin to map the container/pod port to the Host network. For `hostNetwork`, the container attached it self to the host network, becareful when handling this specially if your container is using **Privilege Port** (e.g. ssh-22), this would make you unable to ssh to your node.

Look at this example to further understand. Deploy both YAML file.

*nginx-hostport.yaml*
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-hostport
spec:
  containers:
  - name: nginx-hostport
    image: nginx
    ports:
    - containerPort: 80 
      hostPort: 8080
```
Notice that you can set the Port you can attached to.

*nginx-hostnetwork.yaml*
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-hostnework
spec:
  hostNetwork: true
  containers:
  - name: nginx-hostnetwork
    image: nginx
    ports:
    - containerPort: 80
```
In here you are stuck with port the image is exposing.

Verify what node are the pods are deployed. 
```bash
NAME               READY   STATUS    RESTARTS   AGE     IP                NODE       NOMINATED NODE   READINESS GATES
nginx-hostnework   1/1     Running   0          5m30s   192.168.254.202   master02   <none>           <none>
nginx-hostport     1/1     Running   0          5m35s   172.16.235.61     master03   <none>           <none
```
Notice that `hostnetwork` attached to the host IP, while `hostPort` is still using CLusterIP.

Use `netstat` to verify network attached. SSH to the node the pod attached to.
```bash
# hostPort
tcp        0      0 192.168.254.203:56836   172.16.235.21:8080      TIME_WAIT   -

# hostNetwork
sudo netstat -anp|grep 80
tcp6       0      0 :::80                   :::*                    LISTEN      483234/nginx: maste
```

Curl to verify (master02 IP - 192.168.254.203, master03 IP: 192.168.254.203). 
```bash
# hostPort
curl 192.168.254.203:8080       
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>

# hostNetwork
 curl 192.168.254.202:80            
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```


### Reverse Proxy
Instead of exposing many services individually, a reverse proxy such as NGINX can act as a gateway in front of the cluster. This is not ideal and can be a hassle, since you'll be creating tunnel going to a VPS with a public IP or using Cloudflare tunnel, where you have to create manual entry for every service you want to expose in the internet. 

Some popular service:
- caddy
- nginx reverce proxy
- pangolin
- cloudflare

### Ingress Controllers
An Ingress Controller manages external access to services in a Kubernetes cluster. It acts as a reverse proxy inside the cluster, routing traffic to the correct services. One popular controller is [Ingress-Nginx](https://github.com/kubernetes/ingress-nginx). 

This goes hand in hand with [cert-manager](https://cert-manager.io/), which handles automatic creation of certificate and certificate renewal. 

This is also quite a big topic, start with ingress-controller and then check if your domain provider is supported with cert-manager. I'm using [Cloudflare](https://github.com/cloudflare/origin-ca-issuer) which has it's own certificate authority to handled certifcate inside kubernetes. 

Example:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: marktaguiad-dev-ingress
    cert-manager.io/issuer-kind: OriginIssuer
    cert-manager.io/issuer-group: cert-manager.k8s.cloudflare.com
spec:
  ingressClassName: traefik
  tls:
  - hosts:
      - marktaguiad.dev
    secretName: marktaguiad-dev-tls
  rules:
  - host: marktaguiad.dev
    http:
      paths:
      - path: /
        #pathType: ImplementationSpecific
        pathType: Prefix
        backend:
          service: 
            name: marktaguiad-dev
            port:
              number: 80
```

### Container Network Interface (CNI)
In Kubernetes, a CNI (Container Network Interface) is the plugin system that handles networking for pods. Kubernetes itself does not implement networking—it delegates it to a CNI plugin.
- Provides network connectivity between pods and services
- Assigns IP addresses to pods
- Configures routing and network isolation (optional

Notice when you create a k8s cluster using `kubeadm` the nodes are stuck in `NotReady` state unless you install CNI. 

First install the cni network [plugin](https://github.com/containernetworking/plugins).
```
cd /opt/cni/bin
wget https://github.com/containernetworking/plugins/releases/download/v1.9.0/cni-plugins-linux-amd64-v1.9.0.tgz

# extract in /opt/cni/bin/
tar -xvf cni-plugins-linux-amd64-v1.9.0.tgz
```
Now install CNI plugins, for easy setup and good for learning and development I recommend `flannel`. For production grade, use `calico`, this is more than enough. Research more on this topic if you are interested. 

Let's install `calico`. 
```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.4/manifests/calico.yaml
```
