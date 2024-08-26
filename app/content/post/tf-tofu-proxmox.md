---
title: "Automate VM Provisitin with Terraform or Opentofu"
date: 2024-07-21
author: "Mark Taguiad"
tags: ["proxmox", "qemu", "vm", "opentofu", "terraform"]
ShowToc: true
TocOpen: false
UseHugoToc: true
weight: 2

TocOpen: false
---

# Automate VM Provisition with Terraform or Opentofu
### Background
Been using Terraform/Opentofu when I moved my homelab to dedicated server (old laptop and PC), previously from a bunch of Raspberry Pi. 
Using this technology has made my learning in DevOps more optimal or faster. 

With recent announcement of Hashicorp to change Terraform's opensource licence to a propriety licence, we'll be using Opentofu (just my preference, command will still be relatively similar). 

For this lab you can subtitute opentofu `tofu` command with terraform `tf`. 

# Table of Contents
1. [Install Opentofu](#install-opentofu)
2. [Add Permission to user](#add-permission-to-user)
3. [Generate Proxmox API key](#generate-proxmox-api-key)
4. [Opentofu init](#opentofu-init)
5. [Opentofu plan](#opentofu-plan)
6. [Opentofu apply](#opentofu-apply)
7. [Opentofu destroy](#opentofu-destroy)
8. [Optional Remote tfstate backup](#pptional-remote-tfstate-backup)

### Install Opentofu
You can check this [link](https://opentofu.org/docs/intro/install/) to install base on your distro. 
But for this lab, we'll be using Ubuntu. 
```
# Download the installer script:
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
# Alternatively: wget --secure-protocol=TLSv1_2 --https-only https://get.opentofu.org/install-opentofu.sh -O install-opentofu.sh

# Give it execution permissions:
chmod +x install-opentofu.sh

# Please inspect the downloaded script

# Run the installer:
./install-opentofu.sh --install-method deb

# Remove the installer:
rm -f install-opentofu.sh
```

### Add Permission to user
Navigate to Datacenter > API Tokens > Permission > Add role 'PVEVMAdmin'1.
![tofu](http://chevereto.tagsdev.xyz/images/2024/08/26/tofu3.png)

### Generate Proxmox API key
> **Note:**
> For unsecure method you can also use user/password.

Navigate to Datacenter > API Tokens > Add. Input Token ID of your choice, make sure to untick 'Privilege Separation'
![tofu](http://chevereto.tagsdev.xyz/images/2024/08/26/tofu-1.png)

Make sure to note the generated key since it will only be displayed once. 
![tofu](http://chevereto.tagsdev.xyz/images/2024/08/26/tofu2.png)


### Opentofu init
Opentofu has three stages; `init`, `plan`, `apply`. Let as first describe init phase. 
Create the project/lab directory and files.
```
mkdir tofu && cd tofu
touch main.tf providers.tf terraform.tfvars variables.tf
```
Define the provider, in our case it will be from Telmate/proxmox. 

*main.tf*
```
terraform {
    required_providers {
        proxmox = {
            source  = "telmate/proxmox"
            version = "3.0.1-rc1"
        }
    }
}
```
Now we can define the api credentials.

*providers.tf*
```
provider "proxmox" {
    pm_api_url = var.pm_api_url
    pm_api_token_id = var.pm_api_token_id
    pm_api_token_secret = var.pm_api_token_secret
    pm_tls_insecure = true
}
```

To make it more secure variable are set in a different file (terraform.tfvars, variables.tf).

Define the variables. 

*variables.tf*
```
variable "ssh_key" {
  default = "ssh"
}
variable "proxmox_host" {
    default = "tags-p51"
}
variable "template_name" {
    default = "debian-20240717-cloudinit-template"
}
variable "pm_api_url" {
    default = "https://127.0.0.1:8006/api2/json"
}
variable "pm_api_token_id" {
    default = "user@pam!token"
}
variable "pm_api_token_secret" {
    default = "secret-api-token"
}
variable "k8s_namespace_state" {
    default = "default"
}
```
Variables are sensitive so make sure to add this file it in *.gitignore*. 

*terraform.tfvars*
```
ssh_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAsABgQDtf3e9lQR1uAypz4nrq2nDj0DvZZGONku5wO+M87wUVTistrY8REsWO2W1N/v4p2eX30Bnwk7D486jmHGpXFrpHM0EMf7wtbNj5Gt1bDHo76WSci/IEHpMrbdD5vN8wCW2ZMwJG4J8dfFpUbdmUDWLL21Quq4q9XDx7/ugs1tCZoNybgww4eCcAi7/PAmXcS/u9huUkyiX4tbaKXQx1co7rTHd7f2u5APTVMzX0CdV9Ezc6l8I+LmjZ9rvQav5N1NgFh9B60qk9QJAb8AK9+aYy7bnBCQJ/BwIkWKYmLoVBi8j8v8UVhVdQMvQxLaxz1YcD8pbgU5s1O2nxM1+TqeGxrGHG6f7jqxhGWe21I7i8HPvOHNJcW4oycxFC5PNKnXNybEawE23oIDQfIG3+EudQKfAkJ3YhmrB2l+InIo0Wi9BHBIUNPzTldMS53q2teNdZR9UDqASdBdMgp4Uzfs1+LGdE5ExecSQzt4kZ8+o9oo9hmee4AYNOTWefXdip1= test@host"
proxmox_host = "proxmox node"
template_name = "debian-20240717-cloudinit-template"
pm_api_url = "https://192.168.254.101:8006/api2/json"
pm_api_token_id = "root@pam!tofuapi"
pm_api_token_secret = "apikeygenerated"
```

Save the files and initialize Opentofu. If all goes well, the provider will be installed and Opentofu has been initialized. 
```
[mcbtaguiad@tags-t470 tofu]$ tofu init

Initializing the backend...

Initializing provider plugins...
- terraform.io/builtin/terraform is built in to OpenTofu
- Finding telmate/proxmox versions matching "3.0.1-rc1"...
- Installing telmate/proxmox v3.0.1-rc1...
- Installed telmate/proxmox v3.0.1-rc1. Signature validation was skipped due to the registry not containing GPG keys for this provider

OpenTofu has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that OpenTofu can guarantee to make the same selections by default when
you run "tofu init" in the future.

OpenTofu has been successfully initialized!

You may now begin working with OpenTofu. Try running "tofu plan" to see
any changes that are required for your infrastructure. All OpenTofu commands
should now work.

If you ever set or change modules or backend configuration for OpenTofu,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

### Opentofu plan
Let's now create our VM. We will be using the template created in [part 1](/post/proxmox-create-template).
*main.tf*
```
terraform {
    required_providers {
        proxmox = {
            source  = "telmate/proxmox"
            version = "3.0.1-rc1"
        }
    }
}

resource "proxmox_vm_qemu" "test-vm" {
    count = 1
    name = "test-vm-${count.index + 1}" 
    desc = "test-vm-${count.index + 1}"
    tags = "vm"
    target_node = var.proxmox_host
    vmid = "10${count.index + 1}"

    clone = var.template_name

    cores   = 8
    sockets = 1
    memory  = 8192
    agent = 1
    
    bios = "seabios"
    scsihw = "virtio-scsi-pci"
    bootdisk = "scsi0"

    sshkeys = <<EOF
    ${var.ssh_key}
    EOF

    os_type   = "cloud-init"
    cloudinit_cdrom_storage = "tags-nvme-thin-pool1"
    ipconfig0 = "ip=192.168.254.1${count.index + 1}/24,gw=192.168.254.254"


    disks {
        scsi {
            scsi0 {
                disk {
                    backup = false
                    size       = 25
                    storage    = "tags-nvme-thin-pool1"
                    emulatessd = false
                }
            }
            scsi1 {
                disk {
                    backup = false
                    size       = 64
                    storage    = "tags-nvme-thin-pool1"
                    emulatessd = false
                }
            }
            scsi2 {
                disk {
                    backup = false
                    size       = 64
                    storage    = "tags-hdd-thin-pool1"
                    emulatessd = false
                }
            }
            
        }
    }

    network {
        model = "virtio"
        bridge = "vmbr0"
        firewall = true
        link_down = false
    }
}
```

Save the file and we can run Opentofu plan command. 
```
[mcbtaguiad@tags-t470 tofu]$ tofu plan

OpenTofu used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

OpenTofu will perform the following actions:

  # proxmox_vm_qemu.test-vm[0] will be created
  + resource "proxmox_vm_qemu" "test-vm" {
      + additional_wait           = 5
      + agent                     = 1
      + automatic_reboot          = true
      + balloon                   = 0
      + bios                      = "seabios"
      + boot                      = (known after apply)
      + bootdisk                  = "scsi0"
      + clone                     = "debian-20240717-cloudinit-template"
      + clone_wait                = 10
      + cloudinit_cdrom_storage   = "tags-nvme-thin-pool1"
      + cores                     = 8
      + cpu                       = "host"
      + default_ipv4_address      = (known after apply)
      + define_connection_info    = true
      + desc                      = "test-vm-1"
      + force_create              = false
      + full_clone                = true
      + guest_agent_ready_timeout = 100
      + hotplug                   = "network,disk,usb"
      + id                        = (known after apply)
      + ipconfig0                 = "ip=192.168.254.11/24,gw=192.168.254.254"
      + kvm                       = true
      + linked_vmid               = (known after apply)
      + memory                    = 8192
      + name                      = "test-vm-1"
      + nameserver                = (known after apply)
      + onboot                    = false
      + oncreate                  = false
      + os_type                   = "cloud-init"
      + preprovision              = true
      + reboot_required           = (known after apply)
      + scsihw                    = "virtio-scsi-pci"
      + searchdomain              = (known after apply)
      + sockets                   = 1
      + ssh_host                  = (known after apply)
      + ssh_port                  = (known after apply)
      + sshkeys                   = <<-EOT
            ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDtf3e9lQR1uAypz4nrq2nDj0DvZZGONku5wO+M87wUVTistrY8REsWO2W1N/v4p2eX30Bnwk7D486jmHGpXFrpHM0EMf7wtbNj5Gt1bDHo76WSci/IEHpMrbdD5vN8wCW2ZMwJG4JC8lfFpUbdmUDWLL21Quq4q9XDx7/ugs1tCZoNybgww4eCcAi7/GAmXcS/u9huUkyiX4tbaKXQx1co7rTHd7f2u5APTVMzX0C1V9Ezc6l8I+LmjZ9rvQav5N1NgFh9B60qk9QJAb8AK9+aYy7bnBCBJ/BwIkWKYmLoVBi8j8v8UVhVdQMvQxLax41YcD8pbgU5s1O2nxM1+TqeGxrGHG6f7jqxhGWe21I7i8HPvOHNJcW4oycxFC5PNKnXNybEawE23oIDQfIG3+EudQKfAkJ3YhmrB2l+InIo0Wi9BHBIUNPzTldMS53q2teNdZR9UDqASdBdMgp4Uzfs1+LGdE5ExecSQzt4kZ8+o9oo9hmee4AYNOTWefXdip0= mtaguiad@tags-p51
        EOT
      + tablet                    = true
      + tags                      = "vm"
      + target_node               = "tags-p51"
      + unused_disk               = (known after apply)
      + vcpus                     = 0
      + vlan                      = -1
      + vm_state                  = "running"
      + vmid                      = 101

      + disks {
          + scsi {
              + scsi0 {
                  + disk {
                      + backup               = false
                      + emulatessd           = false
                      + format               = "raw"
                      + id                   = (known after apply)
                      + iops_r_burst         = 0
                      + iops_r_burst_length  = 0
                      + iops_r_concurrent    = 0
                      + iops_wr_burst        = 0
                      + iops_wr_burst_length = 0
                      + iops_wr_concurrent   = 0
                      + linked_disk_id       = (known after apply)
                      + mbps_r_burst         = 0
                      + mbps_r_concurrent    = 0
                      + mbps_wr_burst        = 0
                      + mbps_wr_concurrent   = 0
                      + size                 = 25
                      + storage              = "tags-nvme-thin-pool1"
                    }
                }
              + scsi1 {
                  + disk {
                      + backup               = false
                      + emulatessd           = false
                      + format               = "raw"
                      + id                   = (known after apply)
                      + iops_r_burst         = 0
                      + iops_r_burst_length  = 0
                      + iops_r_concurrent    = 0
                      + iops_wr_burst        = 0
                      + iops_wr_burst_length = 0
                      + iops_wr_concurrent   = 0
                      + linked_disk_id       = (known after apply)
                      + mbps_r_burst         = 0
                      + mbps_r_concurrent    = 0
                      + mbps_wr_burst        = 0
                      + mbps_wr_concurrent   = 0
                      + size                 = 64
                      + storage              = "tags-nvme-thin-pool1"
                    }
                }
              + scsi2 {
                  + disk {
                      + backup               = false
                      + emulatessd           = false
                      + format               = "raw"
                      + id                   = (known after apply)
                      + iops_r_burst         = 0
                      + iops_r_burst_length  = 0
                      + iops_r_concurrent    = 0
                      + iops_wr_burst        = 0
                      + iops_wr_burst_length = 0
                      + iops_wr_concurrent   = 0
                      + linked_disk_id       = (known after apply)
                      + mbps_r_burst         = 0
                      + mbps_r_concurrent    = 0
                      + mbps_wr_burst        = 0
                      + mbps_wr_concurrent   = 0
                      + size                 = 64
                      + storage              = "tags-hdd-thin-pool1"
                    }
                }
            }
        }

      + network {
          + bridge    = "vmbr0"
          + firewall  = true
          + link_down = false
          + macaddr   = (known after apply)
          + model     = "virtio"
          + queues    = (known after apply)
          + rate      = (known after apply)
          + tag       = -1
        }
    }

Plan: 1 to add, 0 to change, 0 to destroy.

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Note: You didn't use the -out option to save this plan, so OpenTofu can't guarantee to take exactly these actions if you run "tofu apply" now.
```

### Opentofu apply
After plan command (review the output summary of tofu plan), we can now create the VM. Since we declared the count as 1 it will create 1 VM. 
Depending on the hardwarde on your cluster, it would take usually around 1 to 2 minutes to provision 1 VM. 
```
[mcbtaguiad@tags-t470 tofu]$ tofu plan

OpenTofu used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

OpenTofu will perform the following actions:

  # proxmox_vm_qemu.test-vm[0] will be created
  + resource "proxmox_vm_qemu" "test-vm" {
      + additional_wait           = 5
      + agent                     = 1
      + automatic_reboot          = true
      + balloon                   = 0
      + bios                      = "seabios"
      + boot                      = (known after apply)
      + bootdisk                  = "scsi0"
      + clone                     = "debian-20240717-cloudinit-template"
      + clone_wait                = 10
      + cloudinit_cdrom_storage   = "tags-nvme-thin-pool1"
      + cores                     = 8
      + cpu                       = "host"
      + default_ipv4_address      = (known after apply)
      + define_connection_info    = true
      + desc                      = "test-vm-1"
      + force_create              = false
      + full_clone                = true
      + guest_agent_ready_timeout = 100
      + hotplug                   = "network,disk,usb"
      + id                        = (known after apply)
      + ipconfig0                 = "ip=192.168.254.11/24,gw=192.168.254.254"
      + kvm                       = true
      + linked_vmid               = (known after apply)
      + memory                    = 8192
      + name                      = "test-vm-1"
      + nameserver                = (known after apply)
      + onboot                    = false
      + oncreate                  = false
      + os_type                   = "cloud-init"
      + preprovision              = true
      + reboot_required           = (known after apply)
      + scsihw                    = "virtio-scsi-pci"
      + searchdomain              = (known after apply)
      + sockets                   = 1
      + ssh_host                  = (known after apply)
      + ssh_port                  = (known after apply)
      + sshkeys                   = <<-EOT
            ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDtf3e9lQR1uAypz4nrq2nDj0DvZZGONku5wO+M87wUVTistrY8REsWO2W1N/v4p2eX30Bnwk7D486jmHGpXFrpHM0EMf7wtbNj5Gt1bDHo76WSci/IEHpMrbdD5vN8wCW2ZMwJG4JC8lfFpUbdmUDWLL21Quq4q9XDx7/ugs1tCZoNybgww4eCcAi7/GAmXcS/u9huUkyiX4tbaKXQx1co7rTHd7f2u5APTVMzX0C1V9Ezc6l8I+LmjZ9rvQav5N1NgFh9B60qk9QJAb8AK9+aYy7bnBCBJ/BwIkWKYmLoVBi8j8v8UVhVdQMvQxLax41YcD8pbgU5s1O2nxM1+TqeGxrGHG6f7jqxhGWe21I7i8HPvOHNJcW4oycxFC5PNKnXNybEawE23oIDQfIG3+EudQKfAkJ3YhmrB2l+InIo0Wi9BHBIUNPzTldMS53q2teNdZR9UDqASdBdMgp4Uzfs1+LGdE5ExecSQzt4kZ8+o9oo9hmee4AYNOTWefXdip0= mtaguiad@tags-p51
        EOT
      + tablet                    = true
      + tags                      = "vm"
      + target_node               = "tags-p51"
      + unused_disk               = (known after apply)
      + vcpus                     = 0
      + vlan                      = -1
      + vm_state                  = "running"
      + vmid                      = 101

      + disks {
          + scsi {
              + scsi0 {
                  + disk {
                      + backup               = false
                      + emulatessd           = false
                      + format               = "raw"
                      + id                   = (known after apply)
                      + iops_r_burst         = 0
                      + iops_r_burst_length  = 0
                      + iops_r_concurrent    = 0
                      + iops_wr_burst        = 0
                      + iops_wr_burst_length = 0
                      + iops_wr_concurrent   = 0
                      + linked_disk_id       = (known after apply)
                      + mbps_r_burst         = 0
                      + mbps_r_concurrent    = 0
                      + mbps_wr_burst        = 0
                      + mbps_wr_concurrent   = 0
                      + size                 = 25
                      + storage              = "tags-nvme-thin-pool1"
                    }
                }
              + scsi1 {
                  + disk {
                      + backup               = false
                      + emulatessd           = false
                      + format               = "raw"
                      + id                   = (known after apply)
                      + iops_r_burst         = 0
                      + iops_r_burst_length  = 0
                      + iops_r_concurrent    = 0
                      + iops_wr_burst        = 0
                      + iops_wr_burst_length = 0
                      + iops_wr_concurrent   = 0
                      + linked_disk_id       = (known after apply)
                      + mbps_r_burst         = 0
                      + mbps_r_concurrent    = 0
                      + mbps_wr_burst        = 0
                      + mbps_wr_concurrent   = 0
                      + size                 = 64
                      + storage              = "tags-nvme-thin-pool1"
                    }
                }
              + scsi2 {
                  + disk {
                      + backup               = false
                      + emulatessd           = false
                      + format               = "raw"
                      + id                   = (known after apply)
                      + iops_r_burst         = 0
                      + iops_r_burst_length  = 0
                      + iops_r_concurrent    = 0
                      + iops_wr_burst        = 0
                      + iops_wr_burst_length = 0
                      + iops_wr_concurrent   = 0
                      + linked_disk_id       = (known after apply)
                      + mbps_r_burst         = 0
                      + mbps_r_concurrent    = 0
                      + mbps_wr_burst        = 0
                      + mbps_wr_concurrent   = 0
                      + size                 = 64
                      + storage              = "tags-hdd-thin-pool1"
                    }
                }
            }
        }

      + network {
          + bridge    = "vmbr0"
          + firewall  = true
          + link_down = false
          + macaddr   = (known after apply)
          + model     = "virtio"
          + queues    = (known after apply)
          + rate      = (known after apply)
          + tag       = -1
        }
    }

Plan: 1 to add, 0 to change, 0 to destroy.

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Note: You didn't use the -out option to save this plan, so OpenTofu can't guarantee to take exactly these actions if you run "tofu apply" now.
```

Notice that a *.tfstate* file is generated, make sure to save or backup this file since it will be necesary when reinitializing/reconfigure or rebuilding your VM/infrastructure.

If all goes well, you'll see at Proxmox GUI the created VM.
![tofu](http://chevereto.tagsdev.xyz/images/2024/08/26/tofu4.png)
 

### Opentofu destroy
To delete the VM, run the destroy command.
```
[mcbtaguiad@tags-t470 tofu]$ tofu destroy
proxmox_vm_qemu.test-vm[0]: Refreshing state... [id=tags-p51/qemu/101]

OpenTofu used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  - destroy

OpenTofu will perform the following actions:

  # proxmox_vm_qemu.test-vm[0] will be destroyed
  - resource "proxmox_vm_qemu" "test-vm" {
      - additional_wait           = 5 -> null
      - agent                     = 1 -> null
      - automatic_reboot          = true -> null
      - balloon                   = 0 -> null
      - bios                      = "seabios" -> null
      - boot                      = "c" -> null
      - bootdisk                  = "scsi0" -> null
      - clone                     = "debian-20240717-cloudinit-template" -> null
      - clone_wait                = 10 -> null
      - cloudinit_cdrom_storage   = "tags-nvme-thin-pool1" -> null
      - cores                     = 8 -> null
      - cpu                       = "host" -> null
      - default_ipv4_address      = "192.168.254.11" -> null
      - define_connection_info    = true -> null
      - desc                      = "test-vm-1" -> null
      - force_create              = false -> null
      - full_clone                = true -> null
      - guest_agent_ready_timeout = 100 -> null
      - hotplug                   = "network,disk,usb" -> null
      - id                        = "tags-p51/qemu/101" -> null
      - ipconfig0                 = "ip=192.168.254.11/24,gw=192.168.254.254" -> null
      - kvm                       = true -> null
      - linked_vmid               = 0 -> null
      - memory                    = 8192 -> null
      - name                      = "test-vm-1" -> null
      - numa                      = false -> null
      - onboot                    = false -> null
      - oncreate                  = false -> null
      - os_type                   = "cloud-init" -> null
      - preprovision              = true -> null
      - qemu_os                   = "other" -> null
      - reboot_required           = false -> null
      - scsihw                    = "virtio-scsi-pci" -> null
      - sockets                   = 1 -> null
      - ssh_host                  = "192.168.254.11" -> null
      - ssh_port                  = "22" -> null
      - sshkeys                   = <<-EOT
            ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDtf3e9lQR1uAypz4nrq2nDj0DvZZGONku5wO+M87wUVTistrY8REsWO2W1N/v4p2eX30Bnwk7D486jmHGpXFrpHM0EMf7wtbNj5Gt1bDHo76WSci/IEHpMrbdD5vN8wCW2ZMwJG4JC8lfFpUbdmUDWLL21Quq4q9XDx7/ugs1tCZoNybgww4eCcAi7/GAmXcS/u9huUkyiX4tbaKXQx1co7rTHd7f2u5APTVMzX0C1V9Ezc6l8I+LmjZ9rvQav5N1NgFh9B60qk9QJAb8AK9+aYy7bnBCBJ/BwIkWKYmLoVBi8j8v8UVhVdQMvQxLax41YcD8pbgU5s1O2nxM1+TqeGxrGHG6f7jqxhGWe21I7i8HPvOHNJcW4oycxFC5PNKnXNybEawE23oIDQfIG3+EudQKfAkJ3YhmrB2l+InIo0Wi9BHBIUNPzTldMS53q2teNdZR9UDqASdBdMgp4Uzfs1+LGdE5ExecSQzt4kZ8+o9oo9hmee4AYNOTWefXdip0= mtaguiad@tags-p51
        EOT -> null
      - tablet                    = true -> null
      - tags                      = "vm" -> null
      - target_node               = "tags-p51" -> null
      - unused_disk               = [] -> null
      - vcpus                     = 0 -> null
      - vlan                      = -1 -> null
      - vm_state                  = "running" -> null
      - vmid                      = 101 -> null

      - disks {
          - scsi {
              - scsi0 {
                  - disk {
                      - backup               = false -> null
                      - discard              = false -> null
                      - emulatessd           = false -> null
                      - format               = "raw" -> null
                      - id                   = 0 -> null
                      - iops_r_burst         = 0 -> null
                      - iops_r_burst_length  = 0 -> null
                      - iops_r_concurrent    = 0 -> null
                      - iops_wr_burst        = 0 -> null
                      - iops_wr_burst_length = 0 -> null
                      - iops_wr_concurrent   = 0 -> null
                      - iothread             = false -> null
                      - linked_disk_id       = -1 -> null
                      - mbps_r_burst         = 0 -> null
                      - mbps_r_concurrent    = 0 -> null
                      - mbps_wr_burst        = 0 -> null
                      - mbps_wr_concurrent   = 0 -> null
                      - readonly             = false -> null
                      - replicate            = false -> null
                      - size                 = 25 -> null
                      - storage              = "tags-nvme-thin-pool1" -> null
                    }
                }
              - scsi1 {
                  - disk {
                      - backup               = false -> null
                      - discard              = false -> null
                      - emulatessd           = false -> null
                      - format               = "raw" -> null
                      - id                   = 1 -> null
                      - iops_r_burst         = 0 -> null
                      - iops_r_burst_length  = 0 -> null
                      - iops_r_concurrent    = 0 -> null
                      - iops_wr_burst        = 0 -> null
                      - iops_wr_burst_length = 0 -> null
                      - iops_wr_concurrent   = 0 -> null
                      - iothread             = false -> null
                      - linked_disk_id       = -1 -> null
                      - mbps_r_burst         = 0 -> null
                      - mbps_r_concurrent    = 0 -> null
                      - mbps_wr_burst        = 0 -> null
                      - mbps_wr_concurrent   = 0 -> null
                      - readonly             = false -> null
                      - replicate            = false -> null
                      - size                 = 64 -> null
                      - storage              = "tags-nvme-thin-pool1" -> null
                    }
                }
              - scsi2 {
                  - disk {
                      - backup               = false -> null
                      - discard              = false -> null
                      - emulatessd           = false -> null
                      - format               = "raw" -> null
                      - id                   = 0 -> null
                      - iops_r_burst         = 0 -> null
                      - iops_r_burst_length  = 0 -> null
                      - iops_r_concurrent    = 0 -> null
                      - iops_wr_burst        = 0 -> null
                      - iops_wr_burst_length = 0 -> null
                      - iops_wr_concurrent   = 0 -> null
                      - iothread             = false -> null
                      - linked_disk_id       = -1 -> null
                      - mbps_r_burst         = 0 -> null
                      - mbps_r_concurrent    = 0 -> null
                      - mbps_wr_burst        = 0 -> null
                      - mbps_wr_concurrent   = 0 -> null
                      - readonly             = false -> null
                      - replicate            = false -> null
                      - size                 = 64 -> null
                      - storage              = "tags-hdd-thin-pool1" -> null
                    }
                }
            }
        }

      - network {
          - bridge    = "vmbr0" -> null
          - firewall  = true -> null
          - link_down = false -> null
          - macaddr   = "B2:47:F3:87:C1:83" -> null
          - model     = "virtio" -> null
          - mtu       = 0 -> null
          - queues    = 0 -> null
          - rate      = 0 -> null
          - tag       = -1 -> null
        }

      - smbios {
          - uuid = "a08b4d18-4346-4d8d-8fcf-44dddf8fffaf" -> null
        }
    }

Plan: 0 to add, 0 to change, 1 to destroy.

Do you really want to destroy all resources?
  OpenTofu will destroy all your managed infrastructure, as shown above.
  There is no undo. Only 'yes' will be accepted to confirm.

  Enter a value: yes

proxmox_vm_qemu.test-vm[0]: Destroying... [id=tags-p51/qemu/101]
proxmox_vm_qemu.test-vm[0]: Destruction complete after 6s

Destroy complete! Resources: 1 destroyed.
```

### Optional Remote tfstate backup
To remote backup state files, you can look futher for available providers [here](https://opentofu.org/docs/language/settings/). 
For this example, we'll be using a kubernetes cluster. The state file will be saved as a secret in the kubernetes cluster.

Configure *main.tf* and add 'terraform_remote_state'.
```
data "terraform_remote_state" "k8s-remote-backup" {
    backend = "kubernetes"
    config = {
        secret_suffix    = "k8s-local"
        load_config_file = true
        namespace = var.k8s_namespace_state
        config_path = var.k8s_config_path
    }
}
```

Add additional variables.

*variables.tf*
```
variable "k8s_config_path" {
    default = "/etc/kubernetes/admin.yaml"
}
variable "k8s_namespace_state" {
    default = "default"
}
```

*terraform.tfvars*
```
k8s_config_path = "~/.config/kube/config.yaml"
k8s_namespace_state = "opentofu-state"
```

After `apply` phase, `tofu state` is always triggered and tf state file is automatically created to kubernetes secrets.
```
[mcbtaguiad@tags-t470 tofu]$ kubectl get secret -n opentofu-state
NAME                             TYPE     DATA   AGE
tfstate-default-state            Opaque   1      3d
```