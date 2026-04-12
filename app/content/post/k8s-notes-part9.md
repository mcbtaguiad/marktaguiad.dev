---
title: "Kubernetes Jobs, CronJob and Init Container"
date: 2026-03-09
author: "Mark Taguiad"
tags: ["k8s", "kubernetes", "daemonsets"]
UseHugoToc: true
weight: 2
---
In Kubernetes, some workloads need to run continuously, such as web servers or APIs. These are typically managed by controllers like Deployments.

However, other workloads only need to run once and finish, such as scripts, data processing tasks, or backups. Kubernetes provides Jobs and CronJobs to handle these types of workloads.

# Table of Contents
{{< toc >}}

### Job
A Job is a Kubernetes resource used to run a task until completion.

The Job controller creates a Pod that executes a command. Once the task finishes successfully, the Pod stops and the Job is marked as completed.
- Runs a task once
- Ensures the task completes successfully
- Creates one or more Pods to execute the task
- Stops once the task finishes

Create Job.
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sleeper
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: sleeper
        image: debian
        command: ["sleep", "15"]
```
Get the job.
```bash
kubectl get job -n demo
NAME      STATUS    COMPLETIONS   DURATION   AGE
sleeper   Running   0/1           12s        12s
```
Notice that job is not finish yet. After 15s the job completed.
```bash
kubectl get job -n demo
NAME      STATUS     COMPLETIONS   DURATION   AGE
sleeper   Complete   1/1           29s        71s
```
### Cron
Sometimes tasks must run periodically, such as every hour or every day.

In traditional systems, this is handled using cron. Kubernetes provides the same functionality using CronJobs.

Create Cron.
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sleeper
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: sleeper
            image: debian
            command: ["sleep", "15"]
```
- `schedule `→ cron expression defining when the job runs
- `jobTemplate` → specification of the Job to run

This cronjob will run every minute. Verify cronjob created.
```bash
kubectl get cronjob -n demo
NAME      SCHEDULE      TIMEZONE   SUSPEND   ACTIVE   LAST SCHEDULE   AGE
sleeper   */1 * * * *   <none>     False     1        7s              2m44s
```
Get the pods.
```bash
kubectl get pods -n demo
NAME                  READY   STATUS      RESTARTS      AGE
sleeper-29552118-sk9pc   0/1     Completed   0             2m11s
sleeper-29552119-p88vr   0/1     Completed   0             71s
```
Notice that the pod is not `READY`, this a normal behavior - that means container has finished its job.

### Init Container
You can create a container that performs task before your main container starts.
- Runs before any app container in the Pod
- Performs initialization tasks
- Must complete successfully before the main containers start
- Can run multiple init containers in sequence

Create Init Container
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-example
spec:
  initContainers:
  - name: init-myservice
    image: busybox
    command: ['sh', '-c', 'echo "Initializing..." && sleep 5 && touch /data/ready']
    volumeMounts:
    - name: shared-data
      mountPath: /data
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: shared-data
      mountPath: /data
  volumes:
  - name: shared-data
    emptyDir: {}
```
Get pods. 
```bash
kubectl get pods -n demo
NAME                     READY   STATUS      RESTARTS      AGE
init-example             0/1     Init:0/1    0             4s
```
Check init container status.
```bash
kubectl describe pod init-example -n demo
Name:             init-example
Namespace:        demo
Priority:         0
Service Account:  default
Node:             master03/192.168.254.203
Start Time:       Tue, 10 Mar 2026 15:31:01 +0800
Labels:           <none>
Annotations:      cni.projectcalico.org/containerID: 36dbbac275093e3861699ea342852c340f231104e1fb0f0656d7900636c9a536
                  cni.projectcalico.org/podIP: 172.16.235.37/32
                  cni.projectcalico.org/podIPs: 172.16.235.37/32
Status:           Running
IP:               172.16.235.37
IPs:
  IP:  172.16.235.37
Init Containers:
  init-myservice:
    Container ID:  containerd://46c42a97223d05df1ba36690ec82b23d03845c68ab1594d2c01064885d0ca7f5
    Image:         busybox
    Image ID:      docker.io/library/busybox@sha256:b3255e7dfbcd10cb367af0d409747d511aeb66dfac98cf30e97e87e4207dd76f
    Port:          <none>
    Host Port:     <none>
    Command:
      sh
      -c
      echo "Initializing..." && sleep 5 && touch /data/ready
    State:          Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Tue, 10 Mar 2026 15:31:04 +0800
      Finished:     Tue, 10 Mar 2026 15:31:09 +0800
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /data from shared-data (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-q8hzh (ro)
Containers:
  app:
    Container ID:   containerd://4b702cf75c30f1222e8ecb3dec202bae3c3dd3a6978d5a33f56b58fd80358a09
    Image:          nginx
    Image ID:       docker.io/library/nginx@sha256:0236ee02dcbce00b9bd83e0f5fbc51069e7e1161bd59d99885b3ae1734f3392e
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Tue, 10 Mar 2026 15:31:11 +0800
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /data from shared-data (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-q8hzh (ro)
Conditions:
  Type                        Status
  PodReadyToStartContainers   True 
  Initialized                 True 
  Ready                       True 
  ContainersReady             True 
  PodScheduled                True 
Volumes:
  shared-data:
    Type:       EmptyDir (a temporary directory that shares a pod's lifetime)
    Medium:     
    SizeLimit:  <unset>
  kube-api-access-q8hzh:
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
  Normal  Scheduled  48s   default-scheduler  Successfully assigned demo/init-example to master03
  Normal  Pulling    47s   kubelet            Pulling image "busybox"
  Normal  Pulled     46s   kubelet            Successfully pulled image "busybox" in 1.471s (1.471s including waiting). Image size: 2222260 bytes.
  Normal  Created    46s   kubelet            Created container: init-myservice
  Normal  Started    45s   kubelet            Started container init-myservice
  Normal  Pulling    40s   kubelet            Pulling image "nginx"
  Normal  Pulled     39s   kubelet            Successfully pulled image "nginx" in 1.565s (1.565s including waiting). Image size: 62944796 bytes.
  Normal  Created    38s   kubelet            Created container: app
  Normal  Started    38s   kubelet            Started container app
```
