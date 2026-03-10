---
title: "Kubernetes Notes - Pod"
date: 2026-03-05T17:22:20+08:00
author: "Mark Taguiad"
tags: ["k8s", "kubernetes", "pod", "kubectl"]
UseHugoToc: true
weight: 2
---
In Kubernetes, you do not deploy containers directly. Instead, containers run inside a Pod, which acts as a wrapper around one or more containers. Pods are the smallest deployable unit in the Kubernetes. 

A Pod provides:
- Shared specification for containers
- Shared storage (volumes)
- Shared network

{{< toc >}}
### Kubeconfig
Before we deploy pods, let's first discuss `kubeconfig` for cluster access. Check this [link](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/) for further explanation.

First find your kubeconfig file of your cluster, if the cluster is created using `kubeadm` it is located at `/etc/kubernetes/admin.conf`, if your using `k3s` then it is at `/etc/rancher/k3s/k3s.yaml`. 

Copy the config to your workstation and export it to your environment. Make sure to change the IP in the config. 
```bash
export KUBECONFIG=~/.config/admin.yaml
```
You can also use this context without setting it in your environment; add this to `kubectl` command everytime you run it.
```bash
kubectl --kubeconfig ~/.config/k3s.yaml
```

### Creating Pods with kubectl
You can create a quick Pod using the command line:
```bash
kubectl run nginx --image=nginx
```
This method is useful for:
- testing
- experiments
- temporary workloads

However, for real deployments, YAML files are preferred.

### Using YAML for Kubernetes Resources
Kubernetes objects are usually defined using YAML manifests.

Advantages of YAML:
- version control (Git)
- reproducibility
- easy sharing with teams
Using the same image earlier `nginx`.
```bash
kind: Pod
apiVersion: v1
metadata:
  name: my-pod
spec:
  containers:
    - name: app
      image: nginx
```
To deploy.
```bash
kubectl apply -f pod.yaml
```
This declares the desired state of the system.

### Multiple Pods
This demonstrates a Pod containing two containers that communicate via a shared volume. Let's use `ubuntu` and `nginx` images, the two pod will share the same `volume`.

Workflow; **pod1** will create the `index.html` file in `/usr/share/nginx/html` that will be serve by **pod2**. 
#### Manifest
*deploy.yaml*
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-demo
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
#### Namespace
To make this pod issolated with other deployment let's create a `namespace` for this deployment.
```bash
kubectl create ns demo
```
#### Deploy
Deploy the pod. 
```bash
kubectl create -f pod.yaml -n demo
```
#### Listing the Pod
Check if the pod is now running.
```bash 
kubectl get pods -n demo
NAME       READY   STATUS    RESTARTS   AGE
pod-demo   2/2     Running   0          61s
```
#### Verify
You can verify the shared volume by executing inside the pod.
```bash
➜  ~ kubectl exec -it pod-demo -c pod1 -n demo -- cat /usr/share/nginx/html/index.html
<html>
<!-- <h2>  </h2> -->
<h3>my first website</h3>
<p>look at me mom i'm a devops.</p>

➜  ~ kubectl exec -it pod-demo -c pod2 -n demo -- curl localhost                      
<html>
<!-- <h2>  </h2> -->
<h3>my first website</h3>
<p>look at me mom i'm a devops.</p>
➜  ~
```
Or port-forward the port of pod2 and curl in your localhost. 
```bash
➜  ~ kubectl port-forward pod/pod-demo 8080:80 -n demo
Forwarding from 127.0.0.1:8080 -> 80
Forwarding from [::1]:8080 -> 80

➜  ~ curl localhost:8080
-e <html>
<!-- <h2>  </h2> -->
<h3>my first website</h3>
<p>look at me mom i'm a devops.</p>
```
### Pod Lifecycle
Pods follow a lifecycle with several phases.
#### Pending
The Pod has been accepted but containers are not yet started.

Possible reasons:
- image pulling
- scheduling delay
#### Running
The Pod has been assigned to a node and containers are running.
#### Succeeded
All containers completed successfully.

Common for:
- batch jobs
- scripts

#### Failed
At least one container terminated with an error.
#### Completed / Terminated
All containers have stopped execution.
### Pod Readiness and Liveliness Probe
Pod lifecycle is quite a bit topic, you can check [here](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) if you are interested. For now I'll discuss about **Readiness Probe** and **Liveliness Probe** of a Pod. If you are here then you are familiar with Docker/Podman health check, it is quite similar to that but this two probe serve different purposes. 
#### Liveness Probe
Checks if the container is still running correctly. If the liveness probe fails, Kubernetes will restart the container.

Example Scenario:
- Your app is stuck in a deadlock or infinite loop.
- The container is still running but not functioning properly.

```yaml
livenessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 10
  periodSeconds: 5
```

#### Readiness Probe
Checks if the container is ready to receive traffic. If the readiness probe fails, Kubernetes will remove the pod from the Service endpoints, but will NOT restart it.

Example Scenario:
- Your app is starting up or loading data and not ready yet.

```yaml
readinessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 5
  periodSeconds: 5
```
Kubernetes will stop sending traffic to the pod. When it is ready again, traffic resumes.

#### Demo
*probe.yaml*
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-probe-demo
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
      - containerPort: 80

    livenessProbe:
      httpGet:
        path: /
        port: 80
      initialDelaySeconds: 15
      periodSeconds: 10
      failureThreshold: 3

    readinessProbe:
      httpGet:
        path: /
        port: 80
      initialDelaySeconds: 5
      periodSeconds: 5
      failureThreshold: 3
```
Deploy.
```bash
kubectl apply -f probe.yaml -n demo
```
Check if probe passed.
```bash
kubectl describe pod nginx-probe-demo -n demo
```
```bash
Name:             nginx-probe-demo
Namespace:        demo
Priority:         0
Service Account:  default
Node:             master03/192.168.254.203
Start Time:       Mon, 09 Mar 2026 17:07:20 +0800
Labels:           <none>
Annotations:      cni.projectcalico.org/containerID: 5c26b3425666c824b56642a51eb09683416cf90ec515c0028a14e6e7a0b47fb7
                  cni.projectcalico.org/podIP: 172.16.235.38/32
                  cni.projectcalico.org/podIPs: 172.16.235.38/32
Status:           Running
IP:               172.16.235.38
IPs:
  IP:  172.16.235.38
Containers:
  nginx:
    Container ID:   containerd://6d5107d125886a9e32bd3c399d3481652ea29bee2688ca5c01f3b4ceffebb118
    Image:          nginx
    Image ID:       docker.io/library/nginx@sha256:0236ee02dcbce00b9bd83e0f5fbc51069e7e1161bd59d99885b3ae1734f3392e
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Mon, 09 Mar 2026 17:07:23 +0800
    Ready:          True
    Restart Count:  0
    Liveness:       http-get http://:80/ delay=15s timeout=1s period=10s #success=1 #failure=3
    Readiness:      http-get http://:80/ delay=5s timeout=1s period=5s #success=1 #failure=3
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-vkzwv (ro)
Conditions:
  Type                        Status
  PodReadyToStartContainers   True 
  Initialized                 True 
  Ready                       True 
  ContainersReady             True 
  PodScheduled                True 
Volumes:
  kube-api-access-vkzwv:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    Optional:                false
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  43s   default-scheduler  Successfully assigned demo/nginx-probe-demo to master03
  Normal  Pulling    42s   kubelet            Pulling image "nginx"
  Normal  Pulled     40s   kubelet            Successfully pulled image "nginx" in 2.066s (2.066s including waiting). Image size: 62944796 bytes.
  Normal  Created    40s   kubelet            Created container: nginx
  Normal  Started    40s   kubelet            Started container nginx
```
Under `Conditon` section, we can see that it all passed/success. 

### Pods Are Ephemeral
Pods are temporary by design.

They can disappear if:
- the node fails
- the Pod crashes
- the Pod is deleted
- the cluster reschedules workloads

Because of this, in real systems Pods are usually managed by higher-level controllers such as:
- Deployments
- Statefulsets
- Daemonsets
- Jobs

These controllers recreate Pods automatically when they fail.

### Clean Up
Since pod has no controller managing it, a pod deleted is gone permanently because nothing is responsible for recreating it. I'll discuss and demonstrate these in next part where we discuss controllers.
```bash
kubectl delete pod pod-demo -n demo
kubectl delete pod nginx-probe-demo -n demo
```
Or just simply use the YAML files.
```
kubectl delete -f deploy.yaml -n demo
kubectl delete -f probe.yaml -n demo

# or 
kubectl delete -f . -n demo
```


### Bonus 
If you are wondering what is the difference of `kubectl apply` and `kubectl create`. `kubectl create` is used to create resources for the first time. If the resources already exist, the command will fail. `kubectl apply` is used to create or update resources declaratively.
