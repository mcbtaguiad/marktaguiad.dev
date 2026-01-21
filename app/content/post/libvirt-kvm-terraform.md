---
title: "Provision libvirt Multiple VM with Terraform/Opentofu"
date: 2025-07-05
author: "Mark Taguiad"
tags: ["libvirt", "qemu", "vm", "cloud-init", "kvm", "terafform", "opentofu"]
ShowToc: true
TocOpen: false
UseHugoToc: true
weight: 2

---

### Background
In this post we'll be using libvirt provisioner with Terraform/Opentofu to deploy mulitple KVM Virtual Machine. 


# Table of Contents
{{< toc >}}

### Install Dependencies

```
sudo dnf install libvirt virt-install virsh -y

# enable and start libvirtd service
sudo systemctl enable --now libvirtd
```

Verify if the host is can now run guest machine.

`virt-host-validate`

Download cloud-init image. For this example we'll be using Ubuntu.

`wget https://cloud-images.ubuntu.com/noble/20250523/noble-server-cloudimg-amd64.img`



### Add Permission to user

Add user to libvirt group to manage VM without using sudo. 

`sudo adduser $USER libvirt`

If you'll be accessing the host remotely, make sure to add your ssh key to the host.

`ssh-copy-id user@server-ip`


### Terraform init
Define the provider, we'll be using proivder by  [dmacvicar/libvirt](https://registry.terraform.io/providers/dmacvicar/libvirt/latest/docs). 

Create the directory and files.

`touch main.tf providers.tf terraform.tfvars variables.tf`

Define the provider.

*main.tf*
```
terraform {
 required_version = ">= 0.13"
  required_providers {
    libvirt = {
      source  = "dmacvicar/libvirt"
      version = "0.8.3"
    }
  }
}
```

If you're running `terraform` on the host use;

`uri = "qemu:///system"` 

If you're running `terraform` remotely. Change username and IP.
`uri = "qemu+ssh://root@192.168.254.48/system"`


*providers.tf*
```
provider "libvirt" {
  #uri = "qemu:///system"
  uri = "qemu+ssh://root@192.168.254.48/system"
}
```

Save the files and initialize Opentofu. If all goes well, the provider will be installed and Opentofu has been initialized. 

```
$ tofu init

Initializing the backend...

Initializing provider plugins...
- Reusing previous version of dmacvicar/libvirt from the dependency lock file
- Reusing previous version of hashicorp/template from the dependency lock file
- Using previously-installed dmacvicar/libvirt v0.8.3
- Using previously-installed hashicorp/template v2.2.0

╷
│ Warning: Additional provider information from registry
│ 
│ The remote registry returned warnings for registry.opentofu.org/hashicorp/template:
│ - This provider is deprecated. Please use the built-in template functions instead of the provider.
╵

OpenTofu has been successfully initialized!

You may now begin working with OpenTofu. Try running "tofu plan" to see
any changes that are required for your infrastructure. All OpenTofu commands
should now work.

If you ever set or change modules or backend configuration for OpenTofu,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

### Variable and Config
Before we execute terraform plan, let us first define some variables and config. 
Under img_url_path; it is where the cloud-init image downloaded earlier. 

For vm_names, it is defined in array-meaning it will create VM depending on how many are defined in the array. In this example it will create **master** and **worker** VM.

*variables.tf*
```
variable "img_url_path" {
  default = "/home/User/Downloads/noble-server-cloudimg-amd64.img"
}

variable "vm_names" {
  description = "vm names"
  type = list(string)
  default = ["master", "worker"]
}

# This is optional, if you want to create volume pool
variable "libvirt_disk_path" {
  description = "path for libvirt pool"
  default     = "/mnt/nvme0n1/kvm-pool"
}
```

For minimal setup, let set the user and password to `root` and `password123`.

`cloud_init.cfg`
```
ssh_pwauth: True
chpasswd:
  list: |
     root:password123
  expire: False
```


Also for network, it will just be using the default network and will get IP from dhcp. For other configuration check this [link1](https://registry.terraform.io/providers/dmacvicar/libvirt/latest/docs/resources/network), [link2](https://wiki.libvirt.org/VirtualNetworking.html#routed-mode-example). 

`network_config.cfg`
```
version: 2
ethernets:
  ens3:
    dhcp4: true

```


### Terraform plan
Let's now create the VM. 

`main.tf`

```
terraform {
 required_version = ">= 0.13"
  required_providers {
    libvirt = {
      source  = "dmacvicar/libvirt"
      version = "0.8.3"
    }
  }
}


resource "libvirt_volume" "k8s-cloudinit" {
  count = length(var.vm_names)
  name   = "${var.vm_names[count.index]}"
  pool   = "kvm-pool"
  source = var.img_url_path
  format = "qcow2"
}

data "template_file" "user_data" {
  template = file("${path.module}/cloud_init.cfg")
}

data "template_file" "network_config" {
  template = file("${path.module}/network_config.cfg")
}

# for more info about paramater check this out
# https://github.com/dmacvicar/terraform-provider-libvirt/blob/master/website/docs/r/cloudinit.html.markdown
# Use CloudInit to add our ssh-key to the instance
# you can add also meta_data field
resource "libvirt_cloudinit_disk" "commoninit" {
  name           = "commoninit.iso"
  user_data      = data.template_file.user_data.rendered
  network_config = data.template_file.network_config.rendered 
}


# Create the machine
resource "libvirt_domain" "domain-k8s" {
  count = length(var.vm_names)
  name = var.vm_names[count.index]
  memory = "2048"
  vcpu   = 2

  cloudinit = libvirt_cloudinit_disk.commoninit.id
  
  network_interface {
    network_name = "default"
  }

  # IMPORTANT: this is a known bug on cloud images, since they expect a console
  # we need to pass it
  # https://bugs.launchpad.net/cloud-images/+bug/1573095
  console {
    type        = "pty"
    target_port = "0"
    target_type = "serial"
  }

  console {
    type        = "pty"
    target_type = "virtio"
    target_port = "1"
  }

  disk {
    volume_id = libvirt_volume.k8s-cloudinit[count.index].id
  }

  graphics {
    type        = "spice"
    listen_type = "address"
    autoport    = true
  }
  
}

```

Save the file and we can run Opentofu plan command. 

```
$ tofu plan
data.template_file.network_config: Reading...
data.template_file.network_config: Read complete after 0s [id=b36a1372ce4ea68b514354202c26c0365df9a17f25cd5acdeeaea525cd913edc]
data.template_file.user_data: Reading...
data.template_file.user_data: Read complete after 0s [id=69a2f32bd20850703577ebc428d302999bc1b2e11021b1221e7297fef83b2479]

OpenTofu used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

OpenTofu will perform the following actions:

  # libvirt_cloudinit_disk.commoninit will be created
  + resource "libvirt_cloudinit_disk" "commoninit" {
      + id             = (known after apply)
      + name           = "commoninit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                dhcp4: true
        EOT
      + pool           = "default"
      + user_data      = <<-EOT
            #cloud-config
            # vim: syntax=yaml
            #
            # ***********************
            #   ---- for more examples look at: ------
            # ---> https://cloudinit.readthedocs.io/en/latest/topics/examples.html
            # ******************************
            #
            # This is the configuration syntax that the write_files module
            # will know how to understand. encoding can be given b64 or gzip or (gz+b64).
            # The content will be decoded accordingly and then written to the path that is
            # provided.
            #
            # Note: Content strings here are truncated for example purposes.
            ssh_pwauth: True
            chpasswd:
              list: |
                 root:password123
              expire: False
        EOT
    }

  # libvirt_domain.domain-k8s[0] will be created
  + resource "libvirt_domain" "domain-k8s" {
      + arch        = (known after apply)
      + autostart   = (known after apply)
      + cloudinit   = (known after apply)
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "master"
      + qemu_agent  = false
      + running     = true
      + type        = "kvm"
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + cpu (known after apply)

      + disk {
          + scsi      = false
          + volume_id = (known after apply)
          + wwn       = (known after apply)
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + hostname     = (known after apply)
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = "default"
        }

      + nvram (known after apply)
    }

  # libvirt_domain.domain-k8s[1] will be created
  + resource "libvirt_domain" "domain-k8s" {
      + arch        = (known after apply)
      + autostart   = (known after apply)
      + cloudinit   = (known after apply)
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "worker"
      + qemu_agent  = false
      + running     = true
      + type        = "kvm"
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + cpu (known after apply)

      + disk {
          + scsi      = false
          + volume_id = (known after apply)
          + wwn       = (known after apply)
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + hostname     = (known after apply)
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = "default"
        }

      + nvram (known after apply)
    }

  # libvirt_volume.k8s-cloudinit[0] will be created
  + resource "libvirt_volume" "k8s-cloudinit" {
      + format = "qcow2"
      + id     = (known after apply)
      + name   = "master"
      + pool   = "kvm-pool"
      + size   = (known after apply)
      + source = "/home/mcbtaguiad/Downloads/noble-server-cloudimg-amd64.img"
    }

  # libvirt_volume.k8s-cloudinit[1] will be created
  + resource "libvirt_volume" "k8s-cloudinit" {
      + format = "qcow2"
      + id     = (known after apply)
      + name   = "worker"
      + pool   = "kvm-pool"
      + size   = (known after apply)
      + source = "/home/mcbtaguiad/Downloads/noble-server-cloudimg-amd64.img"
    }

Plan: 5 to add, 0 to change, 0 to destroy.

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Note: You didn't use the -out option to save this plan, so OpenTofu can't guarantee to take exactly these actions if you run "tofu apply" now.
```

### Terraform apply
After plan-review the output summary of terraform plan, we can now create the VM.

```
$ tofu apply
data.template_file.network_config: Reading...
data.template_file.network_config: Read complete after 0s [id=b36a1372ce4ea68b514354202c26c0365df9a17f25cd5acdeeaea525cd913edc]
data.template_file.user_data: Reading...
data.template_file.user_data: Read complete after 0s [id=69a2f32bd20850703577ebc428d302999bc1b2e11021b1221e7297fef83b2479]

OpenTofu used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

OpenTofu will perform the following actions:

  # libvirt_cloudinit_disk.commoninit will be created
  + resource "libvirt_cloudinit_disk" "commoninit" {
      + id             = (known after apply)
      + name           = "commoninit.iso"
      + network_config = <<-EOT
            version: 2
            ethernets:
              ens3:
                dhcp4: true
        EOT
      + pool           = "default"
      + user_data      = <<-EOT
            #cloud-config
            # vim: syntax=yaml
            #
            # ***********************
            #   ---- for more examples look at: ------
            # ---> https://cloudinit.readthedocs.io/en/latest/topics/examples.html
            # ******************************
            #
            # This is the configuration syntax that the write_files module
            # will know how to understand. encoding can be given b64 or gzip or (gz+b64).
            # The content will be decoded accordingly and then written to the path that is
            # provided.
            #
            # Note: Content strings here are truncated for example purposes.
            ssh_pwauth: True
            chpasswd:
              list: |
                 root:password123
              expire: False
        EOT
    }

  # libvirt_domain.domain-k8s[0] will be created
  + resource "libvirt_domain" "domain-k8s" {
      + arch        = (known after apply)
      + autostart   = (known after apply)
      + cloudinit   = (known after apply)
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "master"
      + qemu_agent  = false
      + running     = true
      + type        = "kvm"
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + cpu (known after apply)

      + disk {
          + scsi      = false
          + volume_id = (known after apply)
          + wwn       = (known after apply)
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + hostname     = (known after apply)
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = "default"
        }

      + nvram (known after apply)
    }

  # libvirt_domain.domain-k8s[1] will be created
  + resource "libvirt_domain" "domain-k8s" {
      + arch        = (known after apply)
      + autostart   = (known after apply)
      + cloudinit   = (known after apply)
      + emulator    = (known after apply)
      + fw_cfg_name = "opt/com.coreos/config"
      + id          = (known after apply)
      + machine     = (known after apply)
      + memory      = 2048
      + name        = "worker"
      + qemu_agent  = false
      + running     = true
      + type        = "kvm"
      + vcpu        = 2

      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "0"
          + target_type    = "serial"
          + type           = "pty"
        }
      + console {
          + source_host    = "127.0.0.1"
          + source_service = "0"
          + target_port    = "1"
          + target_type    = "virtio"
          + type           = "pty"
        }

      + cpu (known after apply)

      + disk {
          + scsi      = false
          + volume_id = (known after apply)
          + wwn       = (known after apply)
        }

      + graphics {
          + autoport       = true
          + listen_address = "127.0.0.1"
          + listen_type    = "address"
          + type           = "spice"
        }

      + network_interface {
          + addresses    = (known after apply)
          + hostname     = (known after apply)
          + mac          = (known after apply)
          + network_id   = (known after apply)
          + network_name = "default"
        }

      + nvram (known after apply)
    }

  # libvirt_volume.k8s-cloudinit[0] will be created
  + resource "libvirt_volume" "k8s-cloudinit" {
      + format = "qcow2"
      + id     = (known after apply)
      + name   = "master"
      + pool   = "kvm-pool"
      + size   = (known after apply)
      + source = "/home/mcbtaguiad/Downloads/noble-server-cloudimg-amd64.img"
    }

  # libvirt_volume.k8s-cloudinit[1] will be created
  + resource "libvirt_volume" "k8s-cloudinit" {
      + format = "qcow2"
      + id     = (known after apply)
      + name   = "worker"
      + pool   = "kvm-pool"
      + size   = (known after apply)
      + source = "/home/mcbtaguiad/Downloads/noble-server-cloudimg-amd64.img"
    }

Plan: 5 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  OpenTofu will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

libvirt_volume.k8s-cloudinit[1]: Creating...
libvirt_cloudinit_disk.commoninit: Creating...
libvirt_volume.k8s-cloudinit[0]: Creating...
libvirt_cloudinit_disk.commoninit: Creation complete after 4s [id=/var/lib/libvirt/images/commoninit.iso;ecbb0a27-be52-435c-a5db-c0e87b58fd3a]
libvirt_volume.k8s-cloudinit[1]: Still creating... [10s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [10s elapsed]
libvirt_volume.k8s-cloudinit[1]: Still creating... [20s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [20s elapsed]
libvirt_volume.k8s-cloudinit[1]: Still creating... [30s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [30s elapsed]
libvirt_volume.k8s-cloudinit[1]: Still creating... [40s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [40s elapsed]
libvirt_volume.k8s-cloudinit[1]: Still creating... [50s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [51s elapsed]
libvirt_volume.k8s-cloudinit[1]: Still creating... [1m0s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [1m1s elapsed]
libvirt_volume.k8s-cloudinit[1]: Still creating... [1m10s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [1m11s elapsed]
libvirt_volume.k8s-cloudinit[1]: Still creating... [1m20s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [1m21s elapsed]
libvirt_volume.k8s-cloudinit[1]: Still creating... [1m30s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [1m31s elapsed]
libvirt_volume.k8s-cloudinit[1]: Still creating... [1m40s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [1m41s elapsed]
libvirt_volume.k8s-cloudinit[1]: Creation complete after 1m43s [id=/mnt/nvme0n1/kvm-pool/worker]
libvirt_volume.k8s-cloudinit[0]: Still creating... [1m51s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [2m1s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [2m11s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [2m21s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [2m31s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [2m41s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [2m51s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [3m1s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [3m11s elapsed]
libvirt_volume.k8s-cloudinit[0]: Still creating... [3m21s elapsed]
libvirt_volume.k8s-cloudinit[0]: Creation complete after 3m30s [id=/mnt/nvme0n1/kvm-pool/master]
libvirt_domain.domain-k8s[1]: Creating...
libvirt_domain.domain-k8s[0]: Creating...
libvirt_domain.domain-k8s[0]: Creation complete after 3s [id=ecdfd825-9912-4876-86d4-50cfc883101e]
libvirt_domain.domain-k8s[1]: Creation complete after 3s [id=9d27f366-6165-4e32-bebe-785a4b1cc75e]

Apply complete! Resources: 5 added, 0 changed, 0 destroyed.
```

### Verify VM
```
$ virsh list --all
 Id   Name          State
------------------------------
 1    master        running
 2    worker        running

```