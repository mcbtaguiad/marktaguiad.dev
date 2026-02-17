---
title: "Linux Router"
date: 2025-06-13
author: "Mark Taguiad"
tags: ["linux", "dns", "dhcp"]
# toc: true
weight: 2
TocOpen: false
UseHugoToc: true

---
{{< warning >}}
To save yourself from headache just install OpenWRT or pfSense.
{{< /warning >}}

# Table of Contents
{{< toc >}}

To goal of this is to configure our Linux server as a router, LAN1 acting as a WAN and other interface like LAN2 to assign IP or WLAN as a hotspot.

### DNS Server

#### Pi-hole
There are many option to run DNS server, but with my broke setup we'll configure Pi-hole. I recommend Bind9 for advance functionality. Head over to their [website](https://docs.pi-hole.net/) for elaborate documentation. 

```yaml
services:
  pihole:
    container_name: pihole
    image: pihole/pihole:latest
    ports:
      # DNS Ports
      - "53:53/tcp"
      - "53:53/udp"
      # Default HTTP Port
      - "80:80/tcp"
      # Default HTTPs Port. FTL will generate a self-signed certificate
      - "443:443/tcp"
      # Uncomment the below if using Pi-hole as your DHCP Server
      #- "67:67/udp"
      # Uncomment the line below if you are using Pi-hole as your NTP server
      #- "123:123/udp"
    environment:
      # Set the appropriate timezone for your location from
      # https://en.wikipedia.org/wiki/List_of_tz_database_time_zones, e.g:
      TZ: 'Europe/London'
      # Set a password to access the web interface. Not setting one will result in a random password being assigned
      FTLCONF_webserver_api_password: 'correct horse battery staple'
      # If using Docker's default `bridge` network setting the dns listening mode should be set to 'ALL'
      FTLCONF_dns_listeningMode: 'ALL'
    # Volumes store your data between container upgrades
    volumes:
      # For persisting Pi-hole's databases and common configuration file
      - './etc-pihole:/etc/pihole'
      # Uncomment the below if you have custom dnsmasq config files that you want to persist. Not needed for most starting fresh with Pi-hole v6. If you're upgrading from v5 you and have used this directory before, you should keep it enabled for the first v6 container start to allow for a complete migration. It can be removed afterwards. Needs environment variable FTLCONF_misc_etc_dnsmasq_d: 'true'
      #- './etc-dnsmasq.d:/etc/dnsmasq.d'
    cap_add:
      # See https://github.com/pi-hole/docker-pi-hole#note-on-capabilities
      # Required if you are using Pi-hole as your DHCP server, else not needed
      - NET_ADMIN
      # Required if you are using Pi-hole as your NTP client to be able to set the host's system time
      - SYS_TIME
      # Optional, if Pi-hole should get some more processing time
      - SYS_NICE
    restart: unless-stopped
```

Run the container.

`docker compose up -d`

Let assume your IP is 192.168.254.15. To check if the DNS server is running you can run this command. 

Check from the server if port 53 is active
```
$ netstat -tulp
netstat -tulpn | grep 53
(Not all processes could be identified, non-owned process info
 will not be shown, you would have to be root to see it all.)
tcp        0      0 127.0.0.1:53            0.0.0.0:*               LISTEN      -                   
tcp        0      0 192.168.254.15:53       0.0.0.0:*               LISTEN      -   
```

Using dig or nslookup.
```
$ dig @192.168.254.15 -p 53 google.com

; <<>> DiG 9.20.15-1~deb13u1-Debian <<>> @192.168.254.15 -p 53 google.com
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 15974
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;google.com.                    IN      A

;; ANSWER SECTION:
google.com.             149     IN      A       142.251.221.14

;; Query time: 18 msec
;; SERVER: 192.168.254.15#53(192.168.254.15) (UDP)
;; WHEN: Mon Jan 26 15:27:39 PST 2026
;; MSG SIZE  rcvd: 55


$ nslookup google.com 192.168.254.15
Server:         192.168.254.15
Address:        192.168.254.15#53

Non-authoritative answer:
Name:   google.com
Address: 142.251.221.46
Name:   google.com
Address: 2404:6800:4017:805::200e
```


#### dnsmasq as DNS Forwarder
With dnsmasq configured as a forwarder DNS can be resolved to your local IP (let the IP set to 192.168.254.15), as a example let our upstream DNS server to be 8.8.8.8. 

First we need to install dnsmasq and start service.
```
apt install dnsmasq
systemctl enable --now dnsmasq
```

You will get error when you start the service, depending what network service you are using configure it to use dnsmasq. 

*networkd*
```
#  /etc/systemd/network/10-eth0.network
Name=eth0

[Network]
Address=192.168.1.1/24
DNS=192.168.254.15
Domains=~.
IPForward=yes

```

*Network Manager*
```
# /etc/NetworkManager/NetworkManager.conf
[main]
dns=dnsmasq
```
 
Also edit your config to point it to your local IP.

Now let as configure dnsmasq.
```
# /etc/dnsmasq.conf
listen-address=127.0.0.1,192.168.254.15
bind-interfaces

interface=eth0
dhcp-range=192.168.1.100,192.168.1.200,12h
```

Look at the next section as dnsmasq can also be configured as  DHCP Server. 

### DHCP Server

#### WAN and LAN

Now let's assume we have two ethernet and we want our Linux server behave like a gateway, eth0 as WAN and eth1 as LAN. First make sure IP forwarding is enabled, most probably enabled if you are using docker.


```
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-router.conf
sudo sysctl --system
```

Set IP for ethernets using netplan, you can use other method. In here we let the server get WAN IP from the ISP, it can also be set to static. And the IP subnet propagated to the other ethernet is 192.168.10.0/24 as seen in the later section (IP range from 192.168.10.100 to .200).

*/etc/netplan/01-router.yaml*
```
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      dhcp4: true

    eth1:
      dhcp4: no
      addresses:
        - 192.168.10.101/24
```
Apply configuration. 

`netplan apply`

Now we configure dnsmasq.

*/etc/dnsmasq.conf*
```
# Serve ONLY the LAN
interface=eth1
bind-interfaces

# DHCP range
dhcp-range=192.168.10.100,192.168.10.200,12h

# DHCP options
dhcp-option=option:router,192.168.10.1
dhcp-option=option:dns-server,192.168.10.1

# DNS forwarding
no-resolv
server=192.168.254.15
server=8.8.8.8

# Hygiene
domain-needed
bogus-priv
```

Start dnsmasq service

`systemctl enable --now dnsmasq`


#### WAN/LAN and Hotspot
Unlike the previous example that has two ethernets, in here we assume we have one ethernet (eth0) acting as WAN/LAN and wireless nic (wlan0) as hotspot.

Like the previous config, we just change the interface to wlan0. 

*/etc/dnsmasq.conf*
```
# Serve ONLY the LAN
interface=wlan0
bind-interfaces

# DHCP range
dhcp-range=192.168.10.100,192.168.10.200,12h

# DHCP options
dhcp-option=option:router,192.168.10.1
dhcp-option=option:dns-server,192.168.10.1

# DNS forwarding
no-resolv
server=192.168.254.15
server=8.8.8.8

# Hygiene
domain-needed
bogus-priv
```

Start dnsmasq.

`systemctl enable --now dnsmasq`


Install hotspod.

`apt install hotspot`

Edit hotspotd configuration.

*/etc/hotspotd/hotspotd.conf*
```
# Interface used for the hotspot
interface=wlan0

# Hotspot IP configuration
address=192.168.10.1
netmask=255.255.255.0

# Bridge (optional – only if you really use one)
# Comment this out if not bridging
# bridge=br0

# Wireless settings
ssid=yourSSID
country_code=PH
driver=nl80211

hw_mode=g
channel=7
ieee80211n=1
wmm_enabled=1

# Security: WPA2-PSK ONLY
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
wpa_pairwise=CCMP
wpa_passphrase=averysecurepassword
```

Start hotspotd service.

`systemctl enable --now hotspotd`