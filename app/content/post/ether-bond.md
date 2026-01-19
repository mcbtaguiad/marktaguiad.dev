---
title: "Bonding Ethernet"
date: 2026-01-05
author: "Mark Taguiad"
tags: ["linux", "ubuntu", "network"]
TocOpen: false
UseHugoToc: true
weight: 2

TocOpen: false
---

Install note bonding two ethernet, working as backup active load-balancing. Also a reminder how careless sometimes when configuring network. Make sure to buy a serial cable in case you messed up your config. Messing up my homelab has become a very dangerous hobby of mine, but weirdly enough I take pride and joy in it (evil laugh). 

### Setup

If you are configuring this on a SSH client, then better be prepared when you lost connection due to miss configuration. Make sure you have a serial cable or if your server has a physical interface. 

Identify your network interface card. For my setup these are *enp5s0* and *eno1*.

```
$ ip show link
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: enp5s0: <BROADCAST,MULTICAST,SLAVE,UP,LOWER_UP> mtu 1500 qdisc mq master bond0 state UP mode DEFAULT group default qlen 1000
    link/ether 00:30:64:5c:e2:4b brd ff:ff:ff:ff:ff:ff
3: eno1: <BROADCAST,MULTICAST,SLAVE,UP,LOWER_UP> mtu 1500 qdisc fq_codel master bond0 state UP mode DEFAULT group default qlen 1000
    link/ether d6:98:ed:47:ea:de brd ff:ff:ff:ff:ff:ff permaddr 00:30:64:5c:e2:4a
    altname enp0s25

# OR

1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute 
       valid_lft forever preferred_lft forever
2: enp5s0: <BROADCAST,MULTICAST,SLAVE,UP,LOWER_UP> mtu 1500 qdisc mq master bond0 state UP group default qlen 1000
    link/ether 00:30:64:5c:e2:4b brd ff:ff:ff:ff:ff:ff
3: eno1: <BROADCAST,MULTICAST,SLAVE,UP,LOWER_UP> mtu 1500 qdisc fq_codel master bond0 state UP group default qlen 1000
    link/ether d6:98:ed:47:ea:de brd ff:ff:ff:ff:ff:ff permaddr 00:30:64:5c:e2:4a
    altname enp0s25

```

If you are using Ubuntu then you are probably using networkd. For some reason you changed your networking with NetworkManager then I can help you (hahaha kidding, madness! I'm talking to my future self who forgot to do this shits). 

First check current config of your system, you probably configured your server to be in DHCP mode. For networkd check in /etc/network, for NetworkManager you can use `nmtui or nmcli` to easily check existing config. Some server also configured its config in /etc/netplan. 

Once you deleted (make backup) the current config, dont restart the network service yet (I know you are using SSH), create a config /etc/netplan/01-bonding.yaml. 

*01-bonding.yaml*
```
network:
  version: 2
  renderer: networkd
  ethernets:
    eno1:
      dhcp4: false
      dhcp6: false
    enp5s0:
      dhcp4: false
      dhcp6: false
  bonds:
    bond0:
      interfaces: [enp5s0, eno1]
      parameters:
        mode: balance-alb #active-backup
        #primary: enp5s0
        mii-monitor-interval: 100
      addresses:
        - 192.168.1.69/24
      #gateway4: 192.168.1.1
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

Easy right, depending on your use case, for this setup I've set it to balance-alb. For reference here are the other mode (copy pasted from the internet). 

1. Active-Backup (mode=1)

Behavior: Only one slave is active. Backup takes over if the active fails.

Switch requirement: None

Use case: Simple failover, compatible with any switch.

2. Balance-rr (mode=0) – Round-robin

Behavior: Packets are sent in round-robin order across all slaves.

Switch requirement: None, but may cause out-of-order packets.

Use case: Simple load balancing across multiple NICs.


3. Balance-xor (mode=2) – XOR policy

Behavior: Selects slave based on MAC addresses (source XOR dest).

Switch requirement: Must support 802.3ad or static config.

Use case: Load balancing with predictable path selection.

4. 802.3ad (mode=4) – LACP (Link Aggregation)

Behavior: Uses LACP protocol to combine links.

Switch requirement: Switch must support LACP.

Use case: True link aggregation with load balancing and redundancy.

5. Balance-tlb (mode=5) – Adaptive transmit load balancing

Behavior: Transmit only, uses load on each slave to balance.

Switch requirement: None

Use case: Good for outgoing traffic load balancing

6. Balance-alb (mode=6) – Adaptive load balancing

Behavior: Includes TLB + receive load balancing (requires ARP negotiation).

Switch requirement: None

Use case: Both transmit and receive load balancing


Now you can apply the config. 
```
# verify config, it temporary apply but can rollback if problem exist. 
# Sometimes it fail, prepare for the worst :)
$ netplan try

$ netplan apply
$ cat /proc/net/bonding/bond0

Ethernet Channel Bonding Driver: v6.8.0-90-generic

Bonding Mode: adaptive load balancing
Primary Slave: None
Currently Active Slave: eno1
MII Status: up
MII Polling Interval (ms): 100
Up Delay (ms): 0
Down Delay (ms): 0
Peer Notification Delay (ms): 0

Slave Interface: enp5s0
MII Status: up
Speed: 1000 Mbps
Duplex: full
Link Failure Count: 0
Permanent HW addr: 00:30:64:5c:e2:4b
Slave queue ID: 0

Slave Interface: eno1
MII Status: up
Speed: 1000 Mbps
Duplex: full
Link Failure Count: 0
Permanent HW addr: 00:30:64:5c:e2:4a
Slave queue ID: 0

```
