---
title: "Automating Kubernetes Cluster Setup with Ansible"
description: "Guide on automating Kubernetes cluster setup using Ansible and kubeadm."
featured_image: "/images/featured/kubeadm-ansible.png"
date: 2025-07-09
author: "Mark Taguiad"
tags: ["ansible", "kubeadm"]
---

# Automating Kubernetes Cluster Setup with Ansible

Over the years, I’ve found myself repeatedly setting up Kubernetes clusters using kubeadm—and while it works well, the manual process can get repetitive and error-prone. That’s why I built [kubeadm-ansible](https://github.com/mcbtaguiad/kubeadm-ansible): an Ansible playbook that automates the entire process of standing up a Kubernetes cluster.

This project was born out of my desire for a simple, reusable way to deploy multi-node clusters quickly—especially in test environments, homelabs, and lightweight production setups.

# Table of Contents
1. [What It Does](#what-it-does)
2. [How to Use It](#how-to-use-it)
3. [Why I Built This](#why-i-built-this)
4. [Final Thoughts](#final-thoughts)



### What It Does
kubeadm-ansible simplifies Kubernetes provisioning by:

1. Installing all required packages (docker, kubeadm, etc.)
2. Networking and firewall setup.
3. Initializing the control plane
4. Joining master to existing cluster. 
5. Joining worker nodes.
6. Installing a network plugin (Calico)
7. Supporting both Ubuntu and CentOS

### How to Use It

Clone the repo:

```
git clone https://github.com/mcbtaguiad/kubeadm-ansible.git
cd kubeadm-ansible
```

Update your inventory file at inventory/host.yaml with the IPs or hostnames of your master and worker nodes. Then run:

Single Master Cluster
```
all:
  hosts:
    master1:
      ansible_ssh_host: 10.0.0.1
    worker1:
      ansible_ssh_host: 10.0.0.2
    worker2:
      ansible_ssh_host: 10.0.0.3
master:
  hosts:
    master1:
      ansible_ssh_host: 10.0.0.1

worker:
  hosts:
    worker1:
      ansible_ssh_host: 10.0.0.2
    worker2:
      ansible_ssh_host: 10.0.0.3
```

Multi Master Cluster

Note: Need at least 3 master nodes for high availability cluster
```
all:
  hosts:
    master1:
      ansible_ssh_host: 10.0.0.1
    master2:
      ansible_ssh_host: 10.0.0.2
    master3:
      ansible_ssh_host: 10.0.0.3
    worker1:
      ansible_ssh_host: 10.0.0.4
    worker2:
      ansible_ssh_host: 10.0.0.5
master:
  hosts:
    master1:
      ansible_ssh_host: 10.0.0.1
    master2:
      ansible_ssh_host: 10.0.0.2
    master3:
      ansible_ssh_host: 10.0.0.3
worker:
  hosts:
    worker1:
      ansible_ssh_host: 10.0.0.4
    worker2:
      ansible_ssh_host: 10.0.0.5
```

Init cluster

`ansible-playbook playbook/kubeadm_init.yaml -i inventory/hosts.yaml`


That’s it. In just a few minutes, you’ll have a functional Kubernetes cluster ready to go. Kube Config file is generated as **admin.yaml** in the current directory.

It can also be customized to add new master or worker node to an existing cluster. Use this inventory file as reference.

Add Master Node
```
all:
  hosts:
    existing_master:
      ansible_ssh_host: 10.0.0.1
    new_master:
      ansible_ssh_host: 10.0.0.2

master:
  hosts:
    existing_master:
      ansible_ssh_host: 10.0.0.1
    new_master:
      ansible_ssh_host: 10.0.0.2

```

Add Worker Node
```
all:
  hosts:
    existing_master:
      ansible_ssh_host: 10.0.0.1
    new_worker:
      ansible_ssh_host: 10.0.0.2
      
master:
  hosts:
    existing_master:
      ansible_ssh_host: 10.0.0.1


master:
  hosts:
    new_worker:
      ansible_ssh_host: 10.0.0.2
```

Run playbook.

`$ ansible-playbook playbook/add_node.yaml -i inventory/host.yaml`

### Why I Built This
There are a lot of Kubernetes provisioning tools out there—but many are complex or overkill for smaller environments. I wanted something:

1. Easy to maintain
2. Transparent (no black boxes)
3. Fully Ansible-based for idempotency and clarity
4. Flexible enough to tweak for custom needs

### Final Thoughts

If you're looking to spin up a Kubernetes cluster without diving into the weeds every time, I hope kubeadm-ansible saves you as much time as it's saved me. Contributions and feedback are always welcome—feel free to fork it, open issues, or submit PRs.

Check it out: [github.com/mcbtaguiad/kubeadm-ansible](https://github.com/mcbtaguiad/kubeadm-ansible)

If you are using k3s instead of kubeadm, check this similar [repo.](https://github.com/mcbtaguiad/k3s-ansible)