---
title: "Kubernetes KubeVirt"
date: 2026-03-19
author: "Mark Taguiad"
tags: ["k8s", "kubernetes", "kubevirt", "kvm", "vm", "qemu"]
UseHugoToc: true
weight: 2
---
{{< info >}}
Don't have any use case for this yet, all of my running services is in microservice/container. Will update post if I have more time to explore this, or maybe if used in work which I don't have currently - HIRE ME PO!
{{< /info >}}
{{< theme-image
light="/images/devops/k8s-notes/k8s-kubevirt-001.png"
dark="/images/devops/k8s-notes/k8s-kubevirt-dark-001.png"
alt="Architecture Diagram"
>}}

Kubernetes is designed to run containerized workloads, but many real-world systems still rely on virtual machines (VMs).

KubeVirt extends Kubernetes by allowing you to run and manage Virtual Machines alongside containers using the same Kubernetes API.
# Table of Contents
{{< toc >}}

### What Is KubeVirt?
Kubevirt essentially brings virtualization into Kubernetes.
- Running Virtual Machines (VMs) inside a Kubernetes cluster
- Managing VMs using kubectl and Kubernetes resources
- Combining VM-based and container-based workloads in one platform

### Architecture
KubeVirt integrates into Kubernetes using Custom Resource Definitions (CRDs) and controllers.

Main components:

**KubeVirt Operator**
- Installs and manages KubeVirt components

**virt-controller**
- Manages VM lifecycle (create, delete, migrate)

**virt-handler**
- Runs on each node (DaemonSet)
- Interfaces with the hypervisor (KVM)

**virt-launcher**
- Runs inside a Pod
- Hosts the actual VM

### Deploy
#### KubeVirt
This process can be found [here](https://kubevirt.io//quickstart_minikube/).

Deploy kubevirt operator.
```bash
export VERSION=$(curl -s https://storage.googleapis.com/kubevirt-prow/release/kubevirt/kubevirt/stable.txt)
echo $VERSION
kubectl create -f "https://github.com/kubevirt/kubevirt/releases/download/${VERSION}/kubevirt-operator.yaml"
```

Deploy the KubeVirt custom resource definitions.
```bash
kubectl create -f "https://github.com/kubevirt/kubevirt/releases/download/${VERSION}/kubevirt-cr.yaml"
```

Check the componets. 
```bash
kubectl get all -n kubevirt
Warning: kubevirt.io/v1 VirtualMachineInstancePresets is now deprecated and will be removed in v2.
NAME                                  READY   STATUS    RESTARTS       AGE
pod/virt-api-7cc64fb85f-ns2qt         1/1     Running   1 (149m ago)   171m
pod/virt-api-7cc64fb85f-z6hfh         1/1     Running   1 (149m ago)   171m
pod/virt-controller-964c8dbcb-96tzj   1/1     Running   3 (46m ago)    170m
pod/virt-controller-964c8dbcb-m84wz   1/1     Running   3 (81m ago)    170m
pod/virt-handler-4ln4g                1/1     Running   0              170m
pod/virt-handler-fwsl2                1/1     Running   0              170m
pod/virt-handler-pn6cn                1/1     Running   0              170m
pod/virt-operator-68f69776bc-6z4p5    1/1     Running   3 (80m ago)    172m
pod/virt-operator-68f69776bc-bccjh    1/1     Running   5 (44m ago)    172m

NAME                                  TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
service/kubevirt-operator-webhook     ClusterIP   10.43.63.183    <none>        443/TCP   171m
service/kubevirt-prometheus-metrics   ClusterIP   None            <none>        443/TCP   171m
service/virt-api                      ClusterIP   10.43.47.236    <none>        443/TCP   171m
service/virt-exportproxy              ClusterIP   10.43.200.237   <none>        443/TCP   171m

NAME                          DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
daemonset.apps/virt-handler   3         3         3       3            3           kubernetes.io/os=linux   170m

NAME                              READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/virt-api          2/2     2            2           171m
deployment.apps/virt-controller   2/2     2            2           170m
deployment.apps/virt-operator     2/2     2            2           172m

NAME                                        DESIRED   CURRENT   READY   AGE
replicaset.apps/virt-api-7cc64fb85f         2         2         2       171m
replicaset.apps/virt-controller-964c8dbcb   2         2         2       170m
replicaset.apps/virt-operator-68f69776bc    2         2         2       172m

NAME                            AGE    PHASE
kubevirt.kubevirt.io/kubevirt   172m   Deployed
```

#### Virtctl
KubeVirt provides an additional binary called virtctl for quick access to the serial and graphical ports of a VM and also handle start/stop operations.
```bash
VERSION=$(kubectl get kubevirt.kubevirt.io/kubevirt -n kubevirt -o=jsonpath="{.status.observedKubeVirtVersion}")
ARCH=$(uname -s | tr A-Z a-z)-$(uname -m | sed 's/x86_64/amd64/') || windows-amd64.exe
echo ${ARCH}
curl -L -o virtctl https://github.com/kubevirt/kubevirt/releases/download/${VERSION}/virtctl-${VERSION}-${ARCH}
sudo install -m 0755 virtctl /usr/local/bin
```

#### Storage
KubeVirt can use PVC and PV but we need additional plugin to install to make it work. 
```bash
export VERSION=$(curl -s https://api.github.com/repos/kubevirt/containerized-data-importer/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
kubectl create -f https://github.com/kubevirt/containerized-data-importer/releases/download/$VERSION/cdi-operator.yaml
kubectl create -f https://github.com/kubevirt/containerized-data-importer/releases/download/$VERSION/cdi-cr.yaml
```
Verify.
```bash
kubectl get cdi -n cdi
NAME   AGE     PHASE
cdi    4h22m   Deployed
```
#### Network
KubeVirt uses Kubernetes networking (CNI), commonly used is Multus and Bridge Networking. But for the demo we'll still be using Load Balancer.
### Example
Unlike traditional VMs, KubeVirt runs VMs inside Pods. Let's demonstrate a practical example here.

Let's run a ubuntu vm inside kubernetes. Like in libvirt we usually first create storage for the VM, it's the same with KubeVirt. 

#### Data Volume 

*ubuntu-datavolume.yml*
```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: "ubuntu-datavolume"
spec:
  source:
    http:
      url: "https://cloud-images.ubuntu.com/noble/20260307/noble-server-cloudimg-amd64.img"
  pvc:
    accessModes:
    - ReadWriteMany
    resources:
      requests:
        storage: "50Gi"
```

```bash
kubectl create -f ubuntu-datavolume.yml -n demo
```
This will create a 50GB `Data Volume`, that the vm can consume and will boot our Ubuntu VM.

Verify.
```bash
kubectl get datavolume -n demo
NAME                PHASE                  PROGRESS   RESTARTS   AGE
ubuntu-datavolume   WaitForFirstConsumer   N/A                   84s
```

#### Virtual Machine
If you are here then you are familiar with cloud-init, define cpu, ram and also user parameter. Check some of my older post regarding [cloud-init](/post/libvirt-cloud-init/).

*ubuntu-vm.yml*
```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  labels:
    kubevirt.io/os: linux
  name: ubuntu 
spec:
  runStrategy: Always
  template:
    metadata:
      creationTimestamp: null
      labels:
        kubevirt.io/domain: ubuntu
    spec:
      domain:
        cpu:
          cores: 1
        devices:
          disks:
          - disk:
              bus: virtio
            name: disk0
          - cdrom:
              bus: sata
              readonly: true
            name: cloudinitdisk
        resources:
          requests:
            memory: 500M
      volumes:
      - name: disk0
        persistentVolumeClaim:
          claimName: ubuntu-datavolume
      - cloudInitNoCloud:
          userData: |
            system_info:
              default_user:
                name: mcbtaguiad
                home: /home/mcbtaguiad
            password: AveryStrongPassword123456789!
            chpasswd: { expire: False }
            hostname: tags-k8s
            ssh_pwauth: True
            disable_root: false
            ssh_authorized_keys:
            - YOUR_PUBLIC_KEY
            name: cloudinitdisk
```

```bash
kubectl create -f ubuntu-vm.yml -n demo 
```

Verify.
```bash
kubectl get all -n demo
Warning: kubevirt.io/v1 VirtualMachineInstancePresets is now deprecated and will be removed in v2.
NAME                             READY   STATUS    RESTARTS   AGE
pod/importer-ubuntu-datavolume   1/1     Running   0          33s

NAME                                           PHASE              PROGRESS   RESTARTS   AGE
datavolume.cdi.kubevirt.io/ubuntu-datavolume   ImportInProgress   82.46%                8m22s

NAME                                        AGE   PHASE     IP    NODENAME   READY
virtualmachineinstance.kubevirt.io/ubuntu   54s   Pending                    False

NAME                                AGE   STATUS     READY
virtualmachine.kubevirt.io/ubuntu   54s   Starting   False
```
We can see here the the `importer` is running, if you check the progress on `datavolume` it is progressing to 100%. Also the VM Instance is still pending, we can verify that the VM is running when the import is complete.
```bash
kubectl get all -n demo
Warning: kubevirt.io/v1 VirtualMachineInstancePresets is now deprecated and will be removed in v2.
NAME                             READY   STATUS    RESTARTS   AGE
pod/virt-launcher-ubuntu-2rwqz   2/2     Running   0          2m30s

NAME                                           PHASE       PROGRESS   RESTARTS   AGE
datavolume.cdi.kubevirt.io/ubuntu-datavolume   Succeeded   100.0%                11m

NAME                                        AGE     PHASE     IP              NODENAME   READY
virtualmachineinstance.kubevirt.io/ubuntu   3m55s   Running   172.16.235.45   master03   True

NAME                                AGE     STATUS    READY
virtualmachine.kubevirt.io/ubuntu   3m55s   Running   True
```
The VM is now running. 

#### Console
To connect to the VM we use `virtctl`, quite similar to `virsh`. Same with virsh use the `domain` we set `ubuntu`.
```bash
virtctl console ubuntu -n demo
Successfully connected to ubuntu console. Press Ctrl+] or Ctrl+5 to exit console.

tags-k8s login: mcbtaguiad
```

Explore other options with `virtctl --help`.

#### Service
Like pods/container in Kubernetes we can also attach service/network to the Virtual Machine instance. 

Make sure to put the correct selector, it's the label we set when creating the Virtual Machine `kubevirt.io/domain: ubuntu`.

*ubuntu-svc.yml*
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ubuntu-svc
  annotations:
    metallb.universe.tf/address-pool: metallb-ip-pool
spec:
  type: LoadBalancer
  selector:
    kubevirt.io/domain: ubuntu
  ports:
    - port: 22
      targetPort: 22
```

```bash
kubectl create -f ubuntu-svc.yml -n demo
```

Verify.
```bash
kubectl get svc -n demo
NAME         TYPE           CLUSTER-IP     EXTERNAL-IP       PORT(S)        AGE
ubuntu-svc   LoadBalancer   10.43.73.139   192.168.254.220   22:30099/TCP   4s
```

SSH to the VM using the external IP.
```bash
ssh 192.168.254.220         
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '192.168.254.220' (ED25519) to the list of known hosts.
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.8.0-101-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Thu Mar 19 10:40:49 UTC 2026

  System load:  0.08               Processes:               112
  Usage of /:   13.8% of 11.78GB   Users logged in:         0
  Memory usage: 19%                IPv4 address for enp1s0: 172.16.235.45
  Swap usage:   0%

Expanded Security Maintenance for Applications is not enabled.

0 updates can be applied immediately.

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status


The list of available updates is more than a week old.
To check for new updates run: sudo apt update


The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.

To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

mcbtaguiad@tags-k8s:~$ 
```
