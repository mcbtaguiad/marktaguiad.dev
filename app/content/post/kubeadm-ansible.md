---
title: "Automating Kubernetes Cluster Setup with Ansible"
date: 2025-07-09
author: "Mark Taguiad"
tags: ["ansible", "kubeadm", "k3s", "calico", "flannel", "longhorn", "ceph", "csi", "cni"]
ShowToc: true
TocOpen: false
UseHugoToc: true
weight: 2
---

Over the years, I’ve found myself repeatedly setting up Kubernetes clusters using kubeadm—and while it works well, the manual process can get repetitive and error-prone. That’s why I built [kubeadm-ansible](https://github.com/mcbtaguiad/kubeadm-ansible): an Ansible playbook that automates the entire process of standing up a Kubernetes cluster.

This project was born out of my desire for a simple, reusable way to deploy multi-node clusters quickly—especially in test environments, homelabs, and lightweight production setups.

# Table of Contents
{{< toc >}}

### What It Does
kubeadm-ansible simplifies Kubernetes provisioning by:

1. Installing all required packages (containerd, kubeadm, etc.)
2. Networking and firewall setup.
3. Initializing the control plane
4. Joining master to existing cluster. 
5. Joining worker nodes.
6. Installing CNI - (Calico/Flannel)
7. Installing CSI - (Rook-Ceph/Longhron)
8. Addon app - metallb, metrics-server, kube-state-metrics, headlamp
9. Support deployment on both Debian base or Redhat base distros.

### Setup
Clone the repo:
```
git clone https://github.com/mcbtaguiad/kubeadm-ansible.git
cd kubeadm-ansible
```
Build docker image or just pull from my repository.
```
docker compose build
docker compose up -d

# exec to container
docker exec -it ansible-kubeadm bash
```
### Inventory
Update your inventory file at `inventory/hosts.ini` with the IPs or hostnames of your master and worker nodes.

#### Single Master Cluster
*hosts.ini*
```
[all]
master01 ansible_host=192.168.254.201 ansible_user=mcbtaguiad
worker01 ansible_host=192.168.254.204 ansible_user=mcbtaguiad
worker02 ansible_host=192.168.254.205 ansible_user=mcbtaguiad

[master]
master01 ansible_host=192.168.254.201 ansible_user=mcbtaguiad

[worker]
worker01 ansible_host=192.168.254.204 ansible_user=mcbtaguiad
worker02 ansible_host=192.168.254.205 ansible_user=mcbtaguiad
```

#### Multi Master Cluster

Note: Need at least 3 master nodes for high availability cluster
```
[all]
master01 ansible_host=192.168.254.201 ansible_user=mcbtaguiad
master02 ansible_host=192.168.254.202 ansible_user=mcbtaguiad
master03 ansible_host=192.168.254.203 ansible_user=mcbtaguiad
worker01 ansible_host=192.168.254.204 ansible_user=mcbtaguiad
worker02 ansible_host=192.168.254.205 ansible_user=mcbtaguiad

[master]
master01 ansible_host=192.168.254.201 ansible_user=mcbtaguiad
master02 ansible_host=192.168.254.202 ansible_user=mcbtaguiad
master03 ansible_host=192.168.254.203 ansible_user=mcbtaguiad

[worker]
worker01 ansible_host=192.168.254.204 ansible_user=mcbtaguiad
worker02 ansible_host=192.168.254.205 ansible_user=mcbtaguiad
```
#### Cluster Config
Enable what you need in you k8s cluster. By default, it is configured with Calico for CNI and Rook-Ceph for CSI. Also Metallb is enabled in the addon role, if you need Ingress Controller then you might need to install that separately. Check the repo for full variable and applications available to install. 

*kubeadm_init.yaml
```yaml
# ============================================================================ #
# Author: Mark Taguiad <marktaguiad@marktaguiad.dev>
# ============================================================================ #
- hosts: all
  become: true
  vars:
    HOST_COUNT: "{{ ansible_play_hosts | length }}"
    KUBECONFIG: /etc/kubernetes/admin.conf

  tasks:

    - name: Run sys role
      include_role:
        name: sys

    - name: Run k8s role
      include_role:
        name: k8s
      vars:
        K8S_VERSION: v1.35

    - name: Wait 30 seconds
      pause:
        seconds: 30

    - name: Run cni role
      include_role:
        name: cni
      vars:
        CNI_PLUGIN_VERSION: v1.9.0
        CALICO_VERSION: v3.31.4
        FLANNEL_VERSION: v0.28.1
        apps_enabled:
          - calico
          # - flannel

    - name: Wait 30 seconds
      pause:
        seconds: 30

    - name: Run csi role
      include_role:
        name: csi
      vars:
        LONGHORN_VERSION: v1.11.0
        ROOK_VERSION: v1.19.2
        apps_enabled:
          - rook-ceph
          # - longhorn

    - name: Wait 60 seconds
      pause:
        seconds: 60

    - name: Run addons role
      include_role:
        name: addons
      vars:
        METALLB_VERSION: v0.15.3
        METALLB_IP_RANGE: "192.168.254.220-192.168.254.250"
        apps_enabled:
          - metallb
          - kube-state-metrics
          - metrics-server
          - headlamp
```
### Init cluster

`ansible-playbook playbook/kubeadm_init.yaml -i inventory/hosts.ini`

That’s it. In just a few minutes, you’ll have a functional Kubernetes cluster ready to go. Kube Config file is generated as **admin.yaml** in the current directory.

### Other Playbook
Check out the repo, I've also added playbook to add `worker` to existing cluster. Playbook to reset the nodes and installing k3s cluster (experimental). 

### k3s
For older or less powerful system, consider using k3s. The repo focus more on kubeadm, some error might be encountered if using this k3s playbook.
```
$ ansible-playbook playbook/k3s_install.yaml -i inventory/hosts.ini 
```
