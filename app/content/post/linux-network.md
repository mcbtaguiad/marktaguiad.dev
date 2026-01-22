---
title: "Linux Networking"
author: "Mark Taguiad"
tags: ["linux"]
# toc: true
weight: 2
TocOpen: false
UseHugoToc: true

---


# Table of Contents
{{< toc >}}

### Show network fromm the command line
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

My current setup is using open-rc to handle services and connman for network.
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

Additional info; if you migrated from NetworkManager to connman, then there is a change that bluetooth will be disabled.
```
connmanctl technologies
connmanctl enable bluetooth
```

### DNS Resolution

In your network, without using a DNS server you can set a DNS resolution for an IP using */etc/hosts*.

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

*/etc/resolv.conf*
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

### Routing




To do
- network services, like dns server, dhcp server, 