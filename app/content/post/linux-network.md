---
title: "Linux Networking"
date: 2025-06-11
author: "Mark Taguiad"
tags: ["linux", "networking", "firewall", "vlan", "ufw", "brige", "iptables", "bond"]
# toc: true
weight: 2
TocOpen: false
UseHugoToc: true

---


# Table of Contents
{{< toc >}}

### Show network
To view your current network interface.
```
$ ip addr show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 brd 127.255.255.255 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host proto kernel_lo 
       valid_lft forever preferred_lft forever
2: eth0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc fq_codel state DOWN group default qlen 1000
    link/ether 54:e1:ad:b0:bf:5d brd ff:ff:ff:ff:ff:ff
3: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether bc:a8:a6:98:05:a8 brd ff:ff:ff:ff:ff:ff
    inet 192.168.254.192/24 brd 192.168.254.255 scope global dynamic noprefixroute wlan0
       valid_lft 249493sec preferred_lft 249493sec
    inet6 fe80::193e:9bd2:aa42:e81/64 scope link noprefixroute 
       valid_lft forever preferred_lft forever
4: virbr0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc htb state DOWN group default qlen 1000
    link/ether 52:54:00:c7:c0:51 brd ff:ff:ff:ff:ff:ff
    inet 192.168.154.10/24 brd 192.168.154.255 scope global virbr0
       valid_lft forever preferred_lft forever

# show config specific interface
ip addr show eth0
```

To see statistic of packet transmission and errors with each interface.
```
$ ip -s addr show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 brd 127.255.255.255 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host proto kernel_lo 
       valid_lft forever preferred_lft forever
    RX:  bytes packets errors dropped  missed   mcast           
      22634840    7482      0       0       0       0 
    TX:  bytes packets errors dropped carrier collsns           
      22634840    7482      0       0       0       0 
2: eth0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc fq_codel state DOWN group default qlen 1000
    link/ether 54:e1:ad:b0:bf:5d brd ff:ff:ff:ff:ff:ff
    RX:  bytes packets errors dropped  missed   mcast           
             0       0      0       0       0       0 
    TX:  bytes packets errors dropped carrier collsns           
             0       0      0       0       0       0 
3: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether bc:a8:a6:98:05:a8 brd ff:ff:ff:ff:ff:ff
    inet 192.168.254.192/24 brd 192.168.254.255 scope global dynamic noprefixroute wlan0
       valid_lft 249447sec preferred_lft 249447sec
    inet6 fe80::193e:9bd2:aa42:e81/64 scope link noprefixroute 
       valid_lft forever preferred_lft forever
    RX:  bytes packets errors dropped  missed   mcast           
    1246317857 1065909      0       0       0       0 
    TX:  bytes packets errors dropped carrier collsns           
      67984061  239361      0      14       0       0 
4: virbr0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc htb state DOWN group default qlen 1000
    link/ether 52:54:00:c7:c0:51 brd ff:ff:ff:ff:ff:ff
    inet 192.168.154.10/24 brd 192.168.154.255 scope global virbr0
       valid_lft forever preferred_lft forever
    RX:  bytes packets errors dropped  missed   mcast           
             0       0      0       0       0       0 
    TX:  bytes packets errors dropped carrier collsns           
             0       0      0       8       0       0

# Alternative command
ifconfig
```

### Setting your network
If your setup is for desktop or PC stick with DHCP, it will automatically get configuration from your router. For static, this would be much complicated in linux - specially if you don't have a desktop environment installed. 

#### Native
If no service installed to handle network.
```
ip addr add 192.168.254.168/24 dev eth0
ip route add default via 192.168.254.254

# up interface
ip link set eth0 up


$ ip a
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 54:e1:ad:b0:bf:5d brd ff:ff:ff:ff:ff:ff
    inet 192.168.254.168/24 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::56e1:adff:feb0:bf5d/64 scope link proto kernel_ll 
       valid_lft forever preferred_lft forever

$ ip route
ip route
default via 192.168.254.254 dev eth0 
127.0.0.0/8 via 127.0.0.1 dev lo 

# To delete current config
ip addr del 192.168.254.168/24 dev eth0
ip route del default via 192.168.254.254 dev eth0 

```

Extra tip regarding route, for some weird scenario that you missed configured one of your interface. And you want network to default to specific interface, change the metric on the routing table. 
```
$ ip r
default via 192.168.254.254 dev wlan0 metric 200
default via 192.168.254.254 dev eth0 metric 4294965247 


ip route del default via 192.168.254.254 dev eth0 metric 4294965247 
ip route add default via 192.168.254.254 dev eth0 metric 100

$ ip r
default via 192.168.254.254 dev eth0 metric 100
default via 192.168.254.254 dev wlan0 metric 200

```

#### Network Manager

For easier setup you can install *NetworkManager* and use *nmtui*, this will lunch a interface in the terminal to configure your network. 

[![imagen](/images/linux/linux-network-001.png)](/images/linux/linux-network-001.png)

With NetworkManager you can also use *nmcli*.
```
# ethernet
nmcli connection add type ethernet con-name "Ethernet connection 1" ifname eth0
nmcli connection modify "Ethernet connection 1" ipv4.method manual ipv4.addresses 192.168.1.100/24 ipv4.gateway 192.168.1.1 ipv4.dns "8.8.8.8 8.8.4.4" ipv4.ignore-auto-dns yes
nmcli connection down "Ethernet connection 1"
nmcli connection up "Ethernet connection 1"

# wireless
nmcli radio wifi on
nmcli device wifi list        #this will scan available wifi 
nmcli device wifi connect "Your_SSID_Name" password "Your_Password"
# or
nmcli device wifi connect "Your_SSID_Name" --ask
sudo nmcli device wifi connect "Your_SSID_Name"
```

#### Networkd

Using systemd-networkd, configuration is created in */etc/systemd/network* with number prefix for priority e.g 10-wired.network. 

10-wired.network
```
[Match]
Name=eth0

[Network]
Address=192.168.1.100/24 # Your desired IP and subnet mask
Gateway=192.168.1.1
DNS=8.8.8.8
```

Connecting to wireless connection with systemd-netword as backend would need to install *iwd* or *wpa_supplicant*. If you've install Arch linux then you should be familiar with iwd.

#### Netplan
This usually comes default with ubuntu server, it uses YAML file and networkd or NetworkManager as backend. Configuration is in */etc/netplan/* with indexing support. 

*10-eth0-.yaml*
```
network:
  version: 2
  renderer: networkd # Or NetworkManager
  ethernets:
    enp0s3:
      dhcp4: no
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

*20-wlan0-.yaml*
```
network:
  version: 2
  renderer: networkd # Or NetworkManager
  wifis:
    wlan0:
      dhcp4: yes
      dhcp6: yes
      access-points:
        "YOURWIFINAME":
          password: "averysecurewifipassword"
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```



#### Other Wireless Solutions

**iwd**
```
iwctl
[iwd]# device list
[iwd]# station wlan0 scan
[iwd]# station wlan0 get-networks
[iwd]# station wlan0 connect SSID
```

**wpa_supplicant**

*/etc/wpa_supplicant/wpa_supplicant-wlan0.conf*
```
ctrl_interface=/var/run/wpa_supplicant
ap_scan=1

network={
    ssid="Your_WiFi_Name"
    psk="Your_WiFi_Password" # Use wpa_passphrase for encrypted PSK
}
```

*/etc/systemd/network/10-wireless.network*
```
[Match]
Name=wlan0 # Or your interface name (e.g., wlp60s0)

[Network]
DHCP=yes
# For static IP:
# Address=192.168.1.100/24
# Gateway=192.168.1.1
# DNS=1.1.1.1
```

```
sudo systemctl enable systemd-networkd
sudo systemctl enable wpa_supplicant@wlan0 # Replace wlan0 if needed
sudo systemctl start systemd-networkd
sudo systemctl start wpa_supplicant@wlan0 # Replace wlan0 if needed
```


#### Connman

My current setup is using open-rc to handle services and connman for network. This is not supported by netplan, it is recommended for desktop or laptop. 
```
yay -S connman connman-openrc
rc-update add connmand default
rc-service connmand start
```

```
wired
connmanctl
connmanctl> enable ethernet
ethernet is already enabled
connmanctl> services
*AR Wired                ethernet_54e1adb0bf5d_cable

connmanctl config ethernet_54e1adb0bf5d_cable --ipv4 manual 192.168.254.69 255.255.255.0 192.168.254.254 --nameservers 8.8.8.8 1.1.1.1
```

```
# wireless
connmanctl enable wifi
connmactl
connmanctl> scan wifi
Scan completed for wifi
connmanctl services

# to connect to an open network, use the second field beginning with wifi_: 
Pakabit Ka ng Net    wifi_bca8a69805a8_50616b61626974204b61206e67204e6574_managed_psk

connmanctl> agent on
connmanctl> connect wifi_bca8a69805a8_50616b61626974204b61206e67204e6574_managed_psk
Agent RequestInput wifi_bca8a69805a8_50616b61626974204b61206e67204e6574_managed_psk
  Passphrase = [ Type=psk, Requirement=mandatory ]
  Passphrase? 


connmanctl> quit
```

Additional info; if you migrated from NetworkManager to connman, then there is a chance that bluetooth will be disabled.
```
connmanctl technologies
connmanctl enable bluetooth
```

### DNS Resolution

In your network, without using a DNS server you can set a DNS resolution for an IP using */etc/hosts*.

#### /etc/hosts

```
# Standard host addresses
127.0.0.1  localhost
::1        localhost ip6-localhost ip6-loopback
ff02::1    ip6-allnodes
ff02::2    ip6-allrouters
# This host address
127.0.1.1  tags-p51

192.168.254.192 tags-deb-001
```

To show your hostname or rename.

#### /etc/hostname

```
$ hostname
tags-p51

$ hostnamectl set-hostname your-hostname

# or just edit the file
vim /etc/hostname
```

Testing with pinging *tags-deb-001*
```
$ ping -c 5 tags-deb-001
PING tags-deb-001 (192.168.254.192) 56(84) bytes of data.
64 bytes from tags-deb-001 (192.168.254.192): icmp_seq=1 ttl=64 time=0.093 ms
64 bytes from tags-deb-001 (192.168.254.192): icmp_seq=2 ttl=64 time=0.051 ms
64 bytes from tags-deb-001 (192.168.254.192): icmp_seq=3 ttl=64 time=0.068 ms
64 bytes from tags-deb-001 (192.168.254.192): icmp_seq=4 ttl=64 time=0.025 ms
64 bytes from tags-deb-001 (192.168.254.192): icmp_seq=5 ttl=64 time=0.075 ms
```

To change the DNS of your server. For temporary overwrite the DNS you can edit /etc/resolv.conf. But if network is managed Network Manager or similar service this will be overwritten on the next boot.

#### /etc/resolv.conf

```
nameserver 8.8.8.8
nameserver 8.8.4.4
```

Using nmtui or nmcli
```
# manual edit using nmtui interface
nmtui

# nmcli
sudo nmcli connection modify "Wired connection 1" ipv4.dns "8.8.8.8, 8.8.4.4"
sudo nmcli connection modify "Wired connection 1" ipv4.ignore-auto-dns yes
```

### Bridges
A network bridge connects multiple network interfaces at Layer 2 (Ethernet) so they behave like they’re on the same switch. This is commonly used by VM and containers to have direct access to the physcal LAN. 

#### Using ip command (temporary / runtime)
This is not persistent and will be removed after reboot. 
```
# create bridge
ip link add br0 type bridge

# add interface to bridge
ip link set eth0 master br0

# bring interfaces up
ip link set br0 up
ip link set eth0 up

# assign IP to bridge
ip addr add 192.168.1.10/24 dev br0
ip route add default via 192.168.1.1
```

#### Using systemd-networkd
Create bridge interface.
*/etc/systemd/network/br0.netdev*
```
[NetDev]
Name=br0
Kind=bridge
```

Configure bridge interface.
*/etc/systemd/network/br0.network*
```
[Match]
Name=br0

[Network]
Address=192.168.1.10/24
Gateway=192.168.1.1
DNS=8.8.8.8
```
On your physical nic, add bridge.
*/etc/systemd/network/eth0.network*
```
[Match]
Name=eth0

[Network]
Bridge=br0
```

Restart service.
```
systemctl enable systemd-networkd
systemctl restart systemd-networkd
```

#### Using Network Manager
```
# create bridge
nmcli con add type bridge ifname br0 con-name br0

# set IP
nmcli con modify br0 ipv4.method manual \
  ipv4.addresses 192.168.1.10/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns 8.8.8.8

# add slave interface
nmcli con add type ethernet ifname eth0 master br0

# bring up bridge
nmcli con up br0
```
#### Using Netplan
*/etc/netplan/01-bridge.yaml*
```
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: no

  bridges:
    br0:
      interfaces: [eth0]
      addresses: [192.168.1.10/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8]
```

Apply.

`netplan apply`

### Bonding
Bonding two ethernet, working as backup active load-balancing. Also a reminder how careless sometimes when configuring network. Make sure to buy a serial cable in case you messed up your config. Messing up my homelab has become a very dangerous hobby of mine, but weirdly enough I take pride and joy in it (evil laugh). 

#### Setup

If you are configuring this on a SSH client, then better be prepared when you lost connection due to miss configuration. Make sure you have a serial cable or if your server has a physical interface. 

Identify your network interface card. For my setup these are *enp5s0* and *eno1*. Note that wifi plus ethernet is also possible. 

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

### Routing
Some of this is already discussed earlier. 

To view current route.
```
ip route show # or just ip r
default via 192.168.254.254 dev eth0 
1.1.1.1 via 192.168.254.254 dev eth0 
8.8.8.8 via 192.168.254.254 dev eth0 
127.0.0.0/8 via 127.0.0.1 dev lo 
192.168.154.0/24 dev virbr0 proto kernel scope link src 192.168.154.10 linkdown 
192.168.254.0/24 dev eth0 proto kernel scope link src 192.168.254.69 
192.168.254.254 dev eth0 scope link 
```

#### Adding and Removing Routes
To route static IP. 
```
ip route add default via 192.168.254.254
ip route del default via 192.168.254.254 dev eth0 

```

To route whole subnet, used in VMs management. 
```
ip route add 192.168.254.0/24 via 192.168.254.254
```

#### Using Gateways and Metric 

You can set up multiple gateways with different metrics, defining a priority order for failover:
```
ip route add default via 192.168.10.1 dev eth0 metric 100
ip route add default via 192.168.20.1 dev eth1 metric 200
```


#### Traffic Flow and Packet Control
With *iptables* it can handle firewall (there is a dedicated section for firewalls, ufw;firewalld), allowing control traffic at more enhanced security.

> [!NOTE]
> Before proceeding to destroy your setup - working over SSH. 

This guarantees you don't cut off SSH access.
```
iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
```

#### View current iptables config
```
iptables -L -v -n 

# list rules with numbers
iptables -L INPUT --line-numbers -n -v
```

#### Setting basic firewall rules. 
This will allow incomming traffic from 192.168.254.0/24 subnet and block all other incomming connection
```
iptables -A INPUT -s 192.168.254.0/24 -j ACCEPT
iptables -A INPUT -j DROP
```

Allow outgoing only to a specific subnet
```
iptables -A OUTPUT -d 192.168.254.0/24 -j ACCEPT
iptables -A OUTPUT -j DROP
```

Block all outgoing traffic
```
iptables -A OUTPUT -j DROP
```

Without this, replies to allowed traffic will be dropped.
```
iptables -A INPUT  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```



Application routing; specific incomming/outgoing PORT. 
```
# DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# UDP DNS (most queries)
iptables -A INPUT -p udp --dport 53 -j ACCEPT

# TCP DNS (zone transfers, large responses, DNSSEC)
iptables -A INPUT -p tcp --dport 53 -j ACCEPT

# Web
iptables -A OUTPUT -p tcp --dport 80  -j ACCEPT
iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT

```

#### Deleting iptable rules

Delete by rule number
```
$ iptables -L INPUT --line-numbers -n -v
num  pkts bytes target  prot opt in  out source              destination
1    ACCEPT all  --  lo  *   0.0.0.0/0           0.0.0.0/0
2    ACCEPT udp  --  *   *   192.168.254.0/24    0.0.0.0/0 udp dpt:53
3    DROP   all  --  *   *   0.0.0.0/0           0.0.0.0/0

$ iptables -D INPUT 2
```

Delete by exact rule match
```
iptables -D OUTPUT -p udp --dport 53 -j ACCEPT
```

Reset completely - please don't do this
```
iptables -F
iptables -X
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
iptables -P FORWARD ACCEPT
```

#### Saving changes

`netfilter-persistent save`


#### Other commands
```
# Flush old rules
iptables -F
iptables -X

# Set iptable to default
iptables -P INPUT DROP
iptables -P OUTPUT DROP
iptables -P FORWARD DROP

# Allow loopback
iptables -A INPUT  -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

```


### Firewall
To simplify iptables, we can use interface like firewalld (fedora base) or ufw (ubuntu base). 

#### UFW - Uncomplicated Firewall
Make sure IPv6 is enabled, this will ensure that rules added include both IPv4 and IPv6. 

*/etc/default/ufw*
```
IPV6=yes
```
##### Default Config
This config will be enough for PC use. 
```
ufw default deny incoming
ufw default allow outgoing
```

##### Allow SSH Connection
If you are configuring this in a ssh session make sure to set this first before applying config.
```
ufw allow ssh

# or allow openssh
$ sudo ufw app list
Available applications:
  OpenSSH
 
$ ufw allow OpenSSH

# allw ssh by port number
$ufw allow 22
```

Optional, rate limit to protect form brute-force attack.

`ufw limit ssh`

##### Enable UFW
UFW should now be configured to accept SSH connection. To verify rules that are added.

`ufw show added`

After comforming you can enable the firewall with.

`ufw enable`

##### Allowing Other Connections
Port range
```    
ufw allow 8000:8080/tcp
ufw allow 8000:8080/udp
```

Specific IP Address
```
ufw allow from 192.168.100.69
ufw allow from 192.168.100.69 to any port 22
```

Subnets
```
ufw allow from 192.168.100.0/24
ufw allow from 192.168.100.0/24 to any port 22
```

To an interface
```
ufw allow in on eth1 to any port 80
```

##### Denying Connections
Deny by service

`ufw deny ssh`

Specific IP Address
```
ufw deby from 192.168.100.69
ufw deny from 192.168.100.69 to any port 22
```

##### Deleting Rules
To delete rules, we need to get the rule number.
```
$ufw status numbered
Status: active

     To                         Action      From
     --                         ------      ----
[ 1] 22                         ALLOW IN    192.168.100.0/24
[ 2] 80                         ALLOW IN    Anywhere


ufw delete 2
```

##### UFW Status and Rules
```
ufw status verbose
```

To disable

`ufw disable`

To reset 

`ufw reset`

Enable logging

`ufw reset`

#### Firewalld
Firewalld is preinstalled on many Linux distributions, such as RHEL and its derivatives (fedora, centos). 

##### Managing Firewalld
Start, stop, enable and disable service.
```
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo systemctl stop firewalld
sudo systemctl disable firewalld
```

To check firewalld state.

`firewall-cmd --state`

To reload firewalld configuration.

`firewall-cmd --reload`

##### Configuring Firewalld
Firewalld has two configuration set; Runtime and Permanent. Permanent configuration is retained even after reboot. 

```
# permanent
firewall-cmd --zone=public --add-service=http --permanent 

# runtime
firewall-cmd --zone=public --add-service=http 
```

##### Zones
Different zones allow different network services and incoming traffic types while denying everything else. After enabling firewalld for the first time, Public will be the default zone.

To view default zone:

```
$ firewall-cmd --get-default-zone
public (default)
  interfaces: eth0
```

```
$ firewall-cmd --zone=public --list-all
public (default, active)
  target: default
  ingress-priority: 0
  egress-priority: 0
  icmp-block-inversion: no
  interfaces: eth0
  sources: 
  services: dhcpv6-client mdns ssh
  ports: 
  protocols: 
  forward: yes
  masquerade: no
  forward-ports: 
  source-ports: 
  icmp-blocks: 
  rich rules: 
```
Going line by line through the output:

-  public (default, active) indicates that the public zone is the default zone (interfaces default to it when they come up), and it is active because it has at least one interface or source associated with it.

-  interfaces: eno1 eno2 lists the interfaces associated with the zone.

-  sources: lists the sources for the zone. There aren't any now, but if there were, they would be of the form xxx.xxx.xxx.xxx/xx.

-  services: dhcpv6-client ssh lists the services allowed through the firewall. You can get an exhaustive list of firewalld's defined services by executing firewall-cmd --get-services.

-  ports: lists port destinations allowed through the firewall. This is useful if you need to allow a service that isn't defined in firewalld.

-  masquerade: no indicates that IP masquerading is disabled for this zone. If enabled, this would allow IP forwarding, with your computer acting as a router.

-  forward-ports: lists ports that are forwarded.

-  icmp-blocks: a blacklist of blocked icmp traffic.

-  rich rules: advanced configurations, processed first in a zone.

-  default is the target of the zone, which determines the action taken on a packet that matches the zone yet isn't explicitly handled by one of the above settings. 


Now let's create a simple multi-zoned firewall rule. 
```
firewall-cmd --permanent --zone=public --remove-service=ssh
firewall-cmd --permanent --zone=public --add-service=http
firewall-cmd --permanent --zone=internal --add-source=192.168.100.69
firewall-cmd --reload
```
We basically removed public SSH access to server and only from IP 192.168.100.69 can access, and http that is accessible outside. 

```
$ firewall-cmd --zone=public --list-all
public (default, active)
  target: default
  ingress-priority: 0
  egress-priority: 0
  icmp-block-inversion: no
  interfaces: eth0
  sources: 
  services: dhcpv6-client http mdns
  ports: 
  protocols: 
  forward: yes
  masquerade: no
  forward-ports: 
  source-ports: 
  icmp-blocks: 
  rich rules: 

$ firewall-cmd --zone=internal --list-all
internal (active)
  target: default
  ingress-priority: 0
  egress-priority: 0
  icmp-block-inversion: no
  interfaces: 
  sources: 192.168.100.69
  services: dhcpv6-client mdns samba-client ssh
  ports: 
  protocols: 
  forward: yes
  masquerade: no
  forward-ports: 
  source-ports: 
  icmp-blocks: 
```

We can also add rule to fully drop an IP to access the server.
```
firewall-cmd --permanent --zone=drop --add-source=192.168.254.169
firewall-cmd --reload
```

##### Rich Rules
Rich rule is used when; services/ports aren’t specific enough, you need conditions (source IP, interface, protocol, family, logging, rate-limit, etc.) and you want iptables-style control without dropping to raw rules.

Deny IPv4 traffic over TCP from host 192.168.254.169 to port 22.
```
firewall-cmd --zone=public --add-rich-rule 'rule family="ipv4" source address="192.168.254.169" port port=22 protocol=tcp reject'
```

Allow IPv4 traffic over TCP from host 192.0.2.0 to port 80, and forward it locally to port 6532.
```
firewall-cmd --zone=public --add-rich-rule 'rule family=ipv4 source address=192.0.2.0 forward-port port=80 protocol=tcp to-port=6532'
```

Forward all IPv4 traffic on port 80 to port 8080 on host 198.168.254.169.
```
firewall-cmd --zone=public --add-rich-rule 'rule family=ipv4 forward-port port=80 protocol=tcp to-port=8080 to-addr=198.168.254.169'
```

To show current rich rule in the public zone.
```
firewall-cmd --zone=public --list-rich-rules
```

### VLAN 

[![imagen](/images/linux/linux-network-002.png)](/images/linux/linux-network-002.png)

A VLAN (Virtual Local Area Network) is a way to split one physical network switch into multiple logical networks.

Even though devices are plugged into the same switch, a VLAN:

- Separates broadcast traffic
- Improves security
- Reduces unnecessary network noise

Each VLAN acts like its own broadcast domain. Devices in VLAN 10 can’t see broadcast traffic from VLAN 20 unless a router or Layer-3 switch connects them.

#### Enable VLAN
Verify if it is present in the kerner.
```
lsmod | grep 8021q
```
If no output, enable using modprobe
```
modprobe 8021q
```
To make if permanent on boot.
```
echo "8021q" | sudo tee -a /etc/module
```

#### Install VLAN
```
# debian base
apt install vlan

#centos base / this is depreciated
dnf install vconfig 
```

#### Create VLAN Interface
Using ip command.
```
ip link add link eth0 name eth0.10 type vlan id 10
ip link set dev eth0.10 up 
ip addr add 192.168.169.169/24 dev eth0.10
```

Using nmcli
```
nmcli connection add type vlan \
  con-name vlan10 \
  ifname eth0.10 \
  dev eth0 \
  id 10

nmcli connection modify vlan10 \
  ipv4.method manual \
  ipv4.addresses 192.168.10.2/24

nmcli connection modify vlan10 \
  ipv4.gateway 192.168.10.1 \
  ipv4.dns 8.8.8.8

nmcli connection up vlan10
```

Using Netplan.
*/etc/netplan/01-vlan.yaml*
```
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      dhcp4: no

  vlans:
    eth0.10:
      id: 10
      link: eth0
      addresses:
        - 192.168.10.2/24
      gateway4: 192.168.10.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

`netplan apply`


Using networkd.
Create parent interface eth0.10 */etc/systemd/network/10-vlan10.netdev*.
```
[Match]
Name=eth0

[Network]
VLAN=eth0.10
```

Configure IP on VLAN interface */etc/systemd/network/10-eth0.10.network*.
```
[Match]
Name=eth0.10

[Network]
Address=192.168.10.2/24
Gateway=192.168.10.1
DNS=8.8.8.8
```

Restart network service.

`systemctl restart systemd-networkd`
