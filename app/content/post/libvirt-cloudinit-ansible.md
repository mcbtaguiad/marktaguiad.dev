---
title: "Automate libvirt Vitual Machine Provisioning with Ansible"
date: 2026-03-03
author: "Mark Taguiad"
tags: ["libvirt", "vm", "virsh", "kvm", "qemu", "ansible", "cloud-init", "ansible"]
UseHugoToc: true
weight: 2
---
{{< info >}}
This is part 2 of this [post](/post/libvirt-cloud-init/).
{{< /info >}}

{{< toc >}}

Let's just automate the process what is discussed in [part 1](/post/libvirt-cloud-init/) using ansible. This ansible playbook can also loop multiple VM to create. 

### Environment
#### Docker/Podman
I've dockerized ansible - taylored to the specific task. Check Dockerfile if you want to run it locally.

First clone the [repo](https://github.com/mcbtaguiad/libvirt-cloudinit-ansible.git).
```bash
git clone https://github.com/mcbtaguiad/libvirt-cloudinit-ansible.git
```
Build the package or just pull the image from gihub registry.
```bash
cd libvirt-cloudinit-ansible    
docker compose build 
docker compose up -d

# or
docker compose up -d
```
#### Image
For this example we will use ubuntu noble cloud [image](https://cloud-images.ubuntu.com/noble/20260225/noble-server-cloudimg-amd64.img).
```bash
cd /srv/nvme/libvirt # my custom pool
wget https://cloud-images.ubuntu.com/noble/20260225/noble-server-cloudimg-amd64.img
```

#### Hypervisor
Edit inventory file and add your hypervisor.
```bash
nvim intentory/host.ini 
```
```ini
[hypervisor]
kvm01 ansible_host=192.168.254.191 ansible_user=mcbtaguiad
```
### Create VM
#### Planning
Now let's create VMs, in this example we will create 2 VMs. First edit `create-vm.yml` playbook.

*create-vm.yml*
```yaml
---
- name: Create multiple VMs
  hosts: hypervisor
  # become: true          # use sudo for all tasks
  # become_method: sudo
  # ansible_become_pass: "YOUR_SUDO_PASSWORD"
  roles:
    - role: virt_vm
      vars:
        vm_name: worker01
        vm_ip: 192.168.254.202
        vm_vcpus: 2
        vm_memory: 4096
        vm_disk_size: 50G
        disk_path: /srv/nvme/libvirt #/var/lib/libvirt/images
        base_image: noble-server-cloudimg-amd64.img
        os_variant: ubuntu24.04

    - role: virt_vm
      vars:
        vm_name: worker02
        vm_dhcp: true
```
In here `worker01` is set to static IP address and `worker03` is set to DHCP. 
#### Variable
For more variable check `roles/virt_vm/defaults/main.yaml`

*main.yaml*
```yaml
vm_name: srvmnldebvm001

vm_user: mcbtaguiad
vm_memory: 4096
vm_vcpus: 2
vm_disk_size: 50G

ssh_public_key: 
  - "sh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDtf3e9lQR1uAypz4nrq2nDj0DvZZGONku5wO+M87wUVTistrY8REsWO2W1N"

#ssh_public_key: "{{ lookup('file', '~/.ssh/id_rsa.pub') }}"

vm_interface: enp1s0

# Networking
vm_dhcp: false
vm_ip: 192.168.254.201
vm_prefix: 24
vm_gateway: 192.168.254.254
vm_dns:
  - 8.8.8.8
vm_network_bridge: br0

disk_path: /srv/nvme/libvirt #/var/lib/libvirt/images
base_image: noble-server-cloudimg-amd64.img
os_variant: ubuntu24.04
```
#### Run Playbook
Exec into the container. 
```bash
docker exec -it ansible-libvirt bash
```
IP of the VM is printed at the end of the loop. I added this in case you set DHCP to `true`.
```bash
ansible-playbook create-vm.yml -i inventory/hosts.ini
```
```bash
PLAY [Create multiple VMs] ******************************************************************************************************************************************************************************************************************

TASK [Gathering Facts] **********************************************************************************************************************************************************************************************************************
[WARNING]: Host 'kvm01' is using the discovered Python interpreter at '/run/current-system/sw/bin/python3.13', but future installation of another Python interpreter could cause a different interpreter to be discovered. See https://docs.ansible.com/ansible-core/2.20/reference_appendices/interpreter_discovery.html for more information.
ok: [kvm01]

TASK [virt_vm : Create QCOW2 disk from backing image] ***************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Render user-data] ***********************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Render meta-data] ***********************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Render network-config] ******************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Generate cloud-init seed ISO] ***********************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Install VM using virt-install] **********************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Get VM IP - wait for vm and qemu guest to start] ****************************************************************************************************************************************************************************
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (20 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (19 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (18 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (17 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (16 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (15 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (14 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (13 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (12 retries left).
changed: [kvm01]

TASK [virt_vm : Show VM IP] *****************************************************************************************************************************************************************************************************************
ok: [kvm01] => {
    "msg": "VM worker01 IP is 192.168.254.202"
}

TASK [virt_vm : Create QCOW2 disk from backing image] ***************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Render user-data] ***********************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Render meta-data] ***********************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Render network-config] ******************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Generate cloud-init seed ISO] ***********************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Install VM using virt-install] **********************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm : Get VM IP - wait for vm and qemu guest to start] ****************************************************************************************************************************************************************************
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (20 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (19 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (18 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (17 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (16 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (15 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (14 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (13 retries left).
FAILED - RETRYING: [kvm01]: Get VM IP - wait for vm and qemu guest to start (12 retries left).
changed: [kvm01]

TASK [virt_vm : Show VM IP] *****************************************************************************************************************************************************************************************************************
ok: [kvm01] => {
    "msg": "VM worker02 IP is 192.168.254.201"
}

PLAY RECAP **********************************************************************************************************************************************************************************************************************************
kvm01                      : ok=17   changed=14   unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

#### Verify
```bash
$ virsh list      
 Id   Name       State
--------------------------
 20   worker01   running
 21   worker02   running
```
### Delete VM
Edit the delete-vm.yml file and add the VM name to the list.

*delete-vm.yml*
```yaml
---
- name: Delete multiple VMs
  hosts: hypervisor
  # become: true
  vars:
    vm_list:
      - worker01
      - worker02
    disk_path: "/srv/nvme/libvirt" #/var/lib/libvirt/images
  tasks:
    - name: Delete multiple VMs
      with_items: "{{ vm_list }}"
      include_role:
        name: virt_vm_delete
      vars:
        vm_name: "{{ item }}"
      loop: "{{ vm_list }}"
```
Run the playbook.
```bash
ansible-playbook delete-vm.yml -i inventory/hosts.ini
```
```bash
PLAY [Delete multiple VMs] ******************************************************************************************************************************************************************************************************************

TASK [Gathering Facts] **********************************************************************************************************************************************************************************************************************
[WARNING]: Host 'kvm01' is using the discovered Python interpreter at '/run/current-system/sw/bin/python3.13', but future installation of another Python interpreter could cause a different interpreter to be discovered. See https://docs.ansible.com/ansible-core/2.20/reference_appendices/interpreter_discovery.html for more information.
ok: [kvm01]

TASK [Delete multiple VMs] ******************************************************************************************************************************************************************************************************************
included: virt_vm_delete for kvm01 => (item=worker01)
included: virt_vm_delete for kvm01 => (item=worker02)

TASK [virt_vm_delete : Fail if vm_name is not defined] **************************************************************************************************************************************************************************************
skipping: [kvm01]

TASK [virt_vm_delete : Check if VM exists] **************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Shut down VM if running] *********************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Force destroy VM if still running] ***********************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Undefine VM] *********************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete VM disk] ******************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete temporary cloud-init user-data] *******************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete temporary cloud-init meta-data] *******************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete temporary cloud-init network-config] **************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete Seed ISO] *****************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Fail if vm_name is not defined] **************************************************************************************************************************************************************************************
skipping: [kvm01]

TASK [virt_vm_delete : Check if VM exists] **************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Shut down VM if running] *********************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Force destroy VM if still running] ***********************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Undefine VM] *********************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete VM disk] ******************************************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete temporary cloud-init user-data] *******************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete temporary cloud-init meta-data] *******************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete temporary cloud-init network-config] **************************************************************************************************************************************************************************
changed: [kvm01]

TASK [virt_vm_delete : Delete Seed ISO] *****************************************************************************************************************************************************************************************************
changed: [kvm01]

PLAY RECAP **********************************************************************************************************************************************************************************************************************************
kvm01                      : ok=21   changed=18   unreachable=0    failed=0    skipped=2    rescued=0    ignored=0   

root@930ca2694fba:/ansible#
```


