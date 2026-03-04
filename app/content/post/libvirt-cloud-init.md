---
title: "Boot Cloud Images with Qemu Libvirt"
date: 2026-02-26
author: "Mark Taguiad"
tags: ["libvirt", "vm", "virsh", "kvm", "qemu", "cloud-init"]
UseHugoToc: true
weight: 2
---

Before I setup my proxmox sever, I am using this workflow. Slow and unproductive but it works. Every process here can be automated with proxmox and terraform, if you are interested check my previous post (kausap ko lang sarili ko dito).

{{< toc >}}

### Prerequisite
- libvirtd is running and can run VM. 
- cloud-utils is installed

Verify if you can run qemu-img, virsh and cloud-locald. 

### Pool
First create pool, skip if you have already created one, or using the default pool - `/var/lib/libvirt/images`. 
```bash
virsh pool-define-as --name pool --typre dir --target /srv/nvme/libvirt
```

### Network
I want my VM to get IP from my router, for that we need to create a bridge network. If you are okay with NAT then skip this step.
*/etc/netplan/01-bridge.yaml*
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: no

  bridges:
    br0:
      interfaces: [eth0]
      addresses: [192.168.254.69/24]
      gateway4: 192.168.254.254
      nameservers:
        addresses: [8.8.8.8]
```
```bash
netplan apply
```
### Backing Image
Download the image, for this example we will be using debian cloud image. 
```bash
cd /srv/nvme/libvirt
wget https://cloud.debian.org/images/cloud/trixie/latest/debian-13-generic-amd64.qcow2
```
Create the backing image.
```bash
qemu-img create -f qcow2 -b debian-13-generic-amd64.qcow2 -F srvmnldebvm001.qcow2 50G
```
- -f qcow2 → format of the new overlay disk
- -b backing/base image
- -F qcow2 → this will be the format of the backing image, and the storage of the vm.
- 50G → virtual size


#### Cloud-init
In this section you can create a directory anywhere you want.
```bash
mkdir ~~/Documents/deb-cloud-init
cd /Documents/deb-cloud-init
touch meta-data.yaml user-data.yaml network-config.yaml
```
Create a cloud-init file.
*user-data.yaml*
```yaml
users:
  - name: mcbtaguiad
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDtf3e9lQR1uAypz4nrq2nDj0DvZZGONku5wO+M87wUVTistrY8REsWO2W1N
        # the ENTIRE key must be a single line
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    groups: sudo
    shell: /bin/bash

ssh_pwauth: false
disable_root: true

packages:
  - qemu-guest-agent

runcmd:
  - systemctl enable qemu-guest-agent
  - systemctl start qemu-guest-agent
```
*meta-data.yaml*
```yaml
instance-id: srvmnldebvm001
local-hostname: srvmnldebvm001
```
*network-config.yaml*
```yaml
network:
  version: 2
  ethernets:
    enp1s0:
      dhcp4: no
      addresses: [192.168.254.201/24]
      nameservers:
           addresses: [8.8.8.8]
      routes:
      - to: 0.0.0.0/0
        via: 192.168.254.254
```
#### Seed ISO
This will provide initial configuration data (user-data, meta-data) to the virtual machines.
```bash
cloud-localds \
  --network-config=network-config.yaml \
  srvmnldebvm001-seed.iso \
  user-data.yaml meta-data.yaml
```
### Create the VM
```bash
virt-install \
    --name srvmnldebvm001 \
    --memory 1024 \
    --vcpus 2 \
    --import \
    --disk path=/srv/nvme/libvirt/srvmnldebvm001.qcow2,format=qcow2,bus=virtio \
    --os-variant debian13 \
    --network bridge=br0,model=virtio \
    --graphics vnc,listen=0.0.0.0 \
    --noautoconsole \
    --cloud-init user-data=user-data.yaml,meta-data=meta-data.yaml,network-config=network-config.yaml \
    --cdrom srvmnldebvm001-seed.iso
```

Connect to the VM or use virt-manager. 
```bash
virsh list --all
virsh console srvmnldebvm001
ssh mcbtaguiad@192.168.254.201 # IP in network-config.yaml
```
Press `Ctrl + ]` to exit console.


### Clean Up
```bash
virsh destroy srvmnldebvm001
virsh undefine srvmnldebvm001
virsh pool-destroy pool
virsh pool-delete pool
```




