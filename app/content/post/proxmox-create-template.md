---
title: "Creating a Proxmox Debian cloud-init Template"
date: 2024-07-21
author: "Mark Taguiad"
tags: ["proxmox", "qemu", "vm", "cloud-init", "debian"]
ShowToc: true
TocOpen: false
UseHugoToc: true
weight: 2

TocOpen: false
---

# Creating a Proxmox Debian cloud-init Template
### Background
Finally have some time to document and publish this blog due to recent Philippines long weekend. This is the first part of the blog, as it is necessary to learn how to create template that will be used in provisioning VM and will be automatically created and deploy with Opentofu/Terraform [(part 2)](/post/tf-tofu-proxmox). 

What set apart a cloud-init image vs. a fully pledge image, basically it is a clone of a miminal image. A clean installed system, that can be installed on the fly, unlike the traditional image where you have to install it using GUI or manually. With cloud-init, hostname, user/password, network and ssh-keys can be set with the config file.  

# Table of Contents
1. [Download the base image](#download-the-base-image)
2. [Install qemu-guest-agent](#install-qemu-guest-agent)
3. [Create Proxmox virtual machine](#create-proxmox-virtual-machine)
4. [Covert VM to Template](#covert-vm-to-template)
5. [Optional Starting the VM](#optional-starting-the-vm)
6. [Using Terraform or Opentofu to automate VM creation](#using-terraform-or-opentofu-to-automate-vm-creation)

### Download the base image
On this part you can change the image to your desired distro, but for this lab we'll be using Debian latest base image - [https://cloud.debian.org/images/cloud/](https://cloud.debian.org/images/cloud/). 

```
wget https://cloud.debian.org/images/cloud/bookworm/20240717-1811/debian-12-generic-amd64-20240717-1811.qcow2
```

### Install qemu-guest-agent
Debian cloud-init images doesn't include qemu-guest-agent by default. To enable it we need virt-customize tool.

Install package
```
apt install libguestfs-tools -y
```

Then install qemu-guest-agent to the image.
```
virt-customize -a debian-12-generic-amd64-20240717-1811.qcow2 --install qemu-guest-agent
```

### Create Proxmox virtual machine

> **Note:**
> Value here can be changed, take note on the VM name as it will be used in part 2.
Create a VM with VMID=1002, VM name with "debian-20240717-cloudinit-template", with basic resources (2 core, 2048Mi ram), with a virtio adapter network.
```
qm create 1002 --name "debian-20240717-cloudinit-template" --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0
```

Import the image to storage (storage pool will depends on you setup) and setting disk 0 to use the image.
```
qm importdisk 1002 debian-12-generic-amd64-20240717-1811.qcow2 tags-nvme-thin-pool1
qm set 1002 --scsihw virtio-scsi-pci --scsi0 tags-nvme-thin-pool1:vm-1002-disk-0
```

Set boot to disk and mounting cloudinit to ide1.
```
qm set 1002 --boot c --bootdisk scsi0
qm set 1002 --ide1 tags-nvme-thin-pool1:cloudinit
```

Set tty to serial0.
```
qm set 1002 --serial0 socket --vga serial0
```

Enable qemu-guest-agent.
```
qm set 1002 --agent enabled=1
```

### Covert VM to Template

There are two ways to covert it to template. 

Option 1: Using the terminal
```
qm template 1002
```

Option 2: GUI
Navigate to Proxmox gui, notice that VM 1002 is listed in the VM list. Click on the VM and click 'More' option and select 'Convert to template'.

At this point you can proceed to Part 2. 

To unconvert to template, navigate to dir `/etc/pve/qemu-server`. Set template equals to 0.
```
vim /etc/pve/qemu-server/1001.conf

agent: enabled=1
boot: c
bootdisk: scsi0
cores: 2
ide1: tags-nvme-thin-pool1:vm-1002-cloudinit,media=cdrom
memory: 2048
meta: creation-qemu=8.1.5,ctime=1724425025
name: debian-20240717-cloudinit-template
net0: virtio=BC:24:11:90:D0:08,bridge=vmbr0
scsi0: tags-nvme-thin-pool1:base-1002-disk-0,size=2G
scsihw: virtio-scsi-pci
serial0: socket
smbios1: uuid=1c1c60fa-62c4-426d-969e-6ebe18ca1d07
template: 0
vga: serial0
vmgenid: 53e2d08a-c57f-4539-abf9-6863e2635ded
```

### Optional Starting the VM
Let first add ssh public key, most cloud-init image has disabled user/password login. 
```
qm set 1002 --sshkey ~/.ssh/id_rsa.pub
```
Set network for the VM. 
```
qm set 1002 --ipconfig0 ip=192.168.254.102/24,gw=192.168.254.254
```
To start the VM.
```
qm start 1002
```
To stop the VM.
```
qm stop 1002
```
To destroy the VM.
```
qm destroy 1002
```

### Using Terraform or Opentofu to automate VM creation

Part 2 - [Automate VM Provisitin with Terraform or Opentofu](/post/tf-tofu-proxmox)