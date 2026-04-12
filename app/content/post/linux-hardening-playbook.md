---
title: "Linux Hardening Using Ansible"
date: 2026-03-14
author: "Mark Taguiad"
tags: ["linux", "playbook", "ansible"]
# toc: true
weight: 2
TocOpen: false
UseHugoToc: true

---

# Table of Contents
{{< toc >}}

Lets automate what was discussed in previous posts. 

### Feature
Any on list can be enabled or disabled and is group as roles.

**User Management**
- User and Group Creation
- Add user to group
- Add user public key
- Option to add to sudo/wheel group
- Set user password aging

**Access Control**
- Disable root access through SSH
- Disable password authentication
- Set maximum simultaneous login
- Add SSH Login Banner
- Set password complexity
- Enable firewall and add SSH

**Package Management**
- Update repo and upgrade current package
- Enable automatic install/upgrade security package
- Enable fail2ban
- Enable logrotate
- Enable NTP/Chrony
- Disable unnecessary package

**System Hardening**
- Removed development pacakge
- Make security dir immutable
- Enable system audit
- Enable Advanced Intrusion Detection Environment
- Kernel hardening `sysctl`
- Ensure sudo use password and uses log

**SSH Login Alert (Bonus)**
- Send alert to telegram bot when user login


### Environment
I've dockerized ansible - tailored to the specific task. Check Dockerfile if you want to run it locally.

First clone the [repo](https://github.com/mcbtaguiad/linux-hardening-playbook.git).
```bash
git clone https://github.com/mcbtaguiad/libvirt-cloudinit-ansible.git
```
Build the package or just pull the image from gihub registry.
```bash
cd linux-hardening-playbook
docker compose build 
docker compose up -d

# or
docker compose up -d
```
### Configuration
#### Inventory
This will use sudo so set `ansible_user` to root or a user with root access.

*inventory/hosts.ini*
```ini
[all]
server01 ansible_host=192.168.254.101 ansible_user=mcbtaguiad
server02 ansible_host=192.168.254.102 ansible_user=mcbtaguiad

[debian-server]
server01 ansible_host=192.168.254.101 ansible_user=mcbtaguiad

[redhat-server]
server02 ansible_host=192.168.254.102 ansible_user=mcbtaguiad
```
#### Playbook
Run individual role or just run the main playbook.

*main.yaml*
```yaml
---
- name: main playbook
  hosts: all
  become: true          # use sudo for all tasks
  become_method: sudo
  # ansible_become_pass: "YOUR_SUDO_PASSWORD"
  roles:
    - role: user_management
      vars:
        password_maxdays: 90
        password_warndays: 7
        users:
        - name: mark
          sudo: true
          key: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDtf3e9lQR1uAypz4nrq2nDj0DvZZGONku5wO+M87wUVTistrY8REsWO2W1N/v4p2eX30Bnwk7D486jmHGpXFrpHM0EMf7wtbNj5Gt1bDHo76WSci/IEHpMrbdD5vN8wCW2ZMwJG4JC8lfFpUbdmUDWLL21Quq4q9XDx7/ugs1tCZoNybgww4eCcAi7/GAmXcS/u9huUkyiX4tbaKXQx1co7rTHd7f2u5APTVMzX0C1V9Ezc6l8I+LmjZ9rvQav5N1NgFh9B60qk9QJAb8AK9+aYy7bnBCBJ/BwIkWKYmLoVBi8j8v8UVhVdQMvQxLax41YcD8pbgU5s1O2nxM1+TqeGxrGHG6f7jqxhGWe21I7i8HPvOHNJcW4oycxFC5PNKnXNybEawE23oIDQfIG3+EudQKfAkJ3YhmrB2l+InIo0Wi9BHBIUNPzTldMS53q2teNdZR9UDqASdBdMgp4Uzfs1+LGdE5ExecSQzt4kZ8+o9oo9hmee4AYNOTWefXdip0= mtaguiad@tags-p51"
          groups:
            - admins
            - developers
        - name: christian
          sudo: false
          key: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDtf3e9lQR1uAypz4nrq2nDj0DvZZGONku5wO+M87wUVTistrY8REsWO2W1N/v4p2eX30Bnwk7D486jmHGpXFrpHM0EMf7wtbNj5Gt1bDHo76WSci/IEHpMrbdD5vN8wCW2ZMwJG4JC8lfFpUbdmUDWLL21Quq4q9XDx7/ugs1tCZoNybgww4eCcAi7/GAmXcS/u9huUkyiX4tbaKXQx1co7rTHd7f2u5APTVMzX0C1V9Ezc6l8I+LmjZ9rvQav5N1NgFh9B60qk9QJAb8AK9+aYy7bnBCBJ/BwIkWKYmLoVBi8j8v8UVhVdQMvQxLax41YcD8pbgU5s1O2nxM1+TqeGxrGHG6f7jqxhGWe21I7i8HPvOHNJcW4oycxFC5PNKnXNybEawE23oIDQfIG3+EudQKfAkJ3YhmrB2l+InIo0Wi9BHBIUNPzTldMS53q2teNdZR9UDqASdBdMgp4Uzfs1+LGdE5ExecSQzt4kZ8+o9oo9hmee4AYNOTWefXdip0= mtaguiad@tags-p51"
          groups:
            - developers

    - role: access_control
      vars:
        max_logins: 2
        password_minlen: 12

     - role: package
       vars:
         unnecessary_services:
          - cups
          - rpcbind
          - nfs-server
          - vsftpd 

     - role: system_hardening
       vars:
         devel_packages_debian:
          - gcc
          - g++
          - make
          - build-essential
          - kernel-devel
          - linux-headers-$(uname -r)
        devel_packages_redhat:
          - gcc
          - gcc-c++
          - make
          - kernel-devel
          - redhat-lsb-core
          - perl
        secure_dirs:
          - /etc/ssh
          - /etc/sudoers.d
        kernel_hardening:
          net.ipv4.ip_forward: 0
          net.ipv4.conf.all.accept_redirects: 0
          net.ipv4.conf.all.send_redirects: 0
          net.ipv4.conf.all.accept_source_route: 0
          net.ipv4.tcp_syncookies: 1
          net.ipv4.conf.all.rp_filter: 1
          kernel.randomize_va_space: 2

    - role: ssh_login_alert
      vars:
        telegram_bot_token: "xxxxxxxxxxxxxxx"
        telegram_chat_id: "xxxxxxxxx"
```
Disable and set what you need to be configured in your host/server.  

Exec to docker container.
```bash
docker exec -it ansible-linux-hardening  bash
```
Run playbook.
```bash
ansible-playbook playbook/main.yml -i inventory/hosts.ini
```
