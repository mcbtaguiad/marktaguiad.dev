---
title: "Secure Reverse Proxying Behind NAT Using WireGuard and Caddy"
date: 2026-05-17
author: "Mark Taguiad"
tags: ["cloudflare", "tunnel", "caddy", "wireguard", "reverse-proxy"]
UseHugoToc: true
weight: 2
---
I’m migrating my existing reverse proxy and TLS termination setup from Pangolin to a simpler and more flexible architecture using Caddy and WireGuard.
# Table of Contents
{{< toc >}}

### Prerequisite
- Server with public IP 
- Local Server (NAT or CGNAT)
- Domain from Cloudflare

### VPS (Public IP)
Install Wireguard.
```bash
sudo apt update
sudo apt install wireguard resolvconf -y
```
Create private key, public key and remove unnecessary permissions from the keys.
```bash
sudo wg genkey | tee /etc/wireguard/server_private_key | sudo wg pubkey > /etc/wireguard/server_public_key

sudo chmod go= /etc/wireguard/server_private_key
```
Create Wireguard server configuration.
```bash
EXT_IF=$(ip route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if ($i=="dev") print $(i+1)}')

sudo cat > /etc/wireguard/wg0.conf <<EOF
# Server configuration
[Interface]
PrivateKey = $(cat /etc/wireguard/server_private_key)
Address = 10.0.0.1/24

# PostUP - Commands to run after starting WireGuard
PostUp = iptables -A FORWARD -i wg0 -o wg0 -j ACCEPT
PostUp = iptables -t nat -I POSTROUTING 1 -s 10.0.0.0/24 -o ${EXT_IF} -j MASQUERADE
PostUp = iptables -I INPUT 1 -i wg0 -j ACCEPT
PostUp = iptables -I FORWARD 1 -i ${EXT_IF} -o wg0 -j ACCEPT
PostUp = iptables -I FORWARD 1 -i wg0 -o ${EXT_IF} -j ACCEPT
PostUp = iptables -A FORWARD -i ${EXT_IF} -o wg0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Accept connections to WireGuard and HTTP/HTTPS ports
PostUp = iptables -I INPUT 1 -i ${EXT_IF} -p udp --dport 51820 -j ACCEPT
PostUp = iptables -I INPUT 1 -i ${EXT_IF} -p tcp --dport 80 -j ACCEPT
PostUp = iptables -I INPUT 1 -i ${EXT_IF} -p tcp --dport 443 -j ACCEPT

# PostDown - Commands to run after stopping WireGuard
PostDown = iptables -D FORWARD -i wg0 -o wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -s 10.0.0.0/24 -o ${EXT_IF} -j MASQUERADE
PostDown = iptables -D INPUT -i wg0 -j ACCEPT
PostDown = iptables -D FORWARD -i ${EXT_IF} -o wg0 -j ACCEPT
PostDown = iptables -D FORWARD -i wg0 -o ${EXT_IF} -j ACCEPT
PostDown = iptables -D FORWARD -i e${EXT_IF} -o wg0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

PostDown = iptables -D INPUT -i ${EXT_IF} -p udp --dport 51820 -j ACCEPT
PostDown = iptables -D INPUT -i ${EXT_IF} -p tcp --dport 80 -j ACCEPT
PostDown = iptables -D INPUT -i ${EXT_IF} -p tcp --dport 443 -j ACCEPT

# WireGuard port
ListenPort = 51820

# Client Configuration
[Peer]
PublicKey = $(cat /etc/wireguard/client_public_key)
AllowedIPs = 10.0.0.2/32
EOF
```
Enable IP forwarding and WireGuard service.
```bash
# Enable IP forwarding
sudo sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
sudo sysctl -p
# Enable WireGuard service
sudo systemctl enable wg-quick@wg0.service
sudo systemctl start wg-quick@wg0.service
```
Check Wireguard status.
```bash
sudo wg show
```
Create peer config, later copy this to your local node.
```bash
mkdir /opt/wireguard/peer001

sudo wg genkey | tee /opt/wireguard/peer001/client_private_key | sudo wg pubkey > /opt/wireguard/peer001/client_public_key

sudo cat > /opt/wireguard/peer001/peer_wg0.conf <<EOF
[Interface]
PrivateKey = $(cat /opt/wireguard/peer001/client_private_key)
Address = 10.0.0.2/32

[Peer]
PublicKey = $(cat /etc/wireguard/server_public_key)
Endpoint = $(curl ifconfig.me):51820
AllowedIPs = 10.0.0.0/8
PersistentKeepalive = 25
EOF
```
Optional, create QR for the configurations.
```bash
qrencode -o /opt/wireguard/peer001/wireguard_qr.png < /opt/wireguard/peer001/peer_wg0.conf
```
Repeat this process if you want to create and add more peer. Make sure to create dir per config and change the peer IP address.

Also add the private key and IP address of new peer. 

*/etc/wireguard/wg0.conf*
```txt
PostDown = iptables -D INPUT -i ${EXT_IF} -p udp --dport 51820 -j ACCEPT
PostDown = iptables -D INPUT -i ${EXT_IF} -p tcp --dport 80 -j ACCEPT
PostDown = iptables -D INPUT -i ${EXT_IF} -p tcp --dport 443 -j ACCEPT

ListenPort = 51820

[Peer]
PublicKey = $(cat /etc/wireguard/client_public_key)
AllowedIPs = 10.0.0.2/32
EOF

# ADD HERE
[Peer]
PublicKey = NEW_CLIENT_PUBLIC_KEY
AllowedIPs = 10.0.0.3/32
```

###  Wireguard Peer (Local Server)
Install wireguard.
```bash
sudo apt update
sudo apt install wireguard resolvconf -y
```
Enable IP forwarding and WireGuard service.
```bash
sudo sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
sudo sysctl -p
```
Copy Wireguard peer config. 
*/etc/wireguard/wg0.conf*
```txt
[Interface]
PrivateKey = 8DW1ba8GHfA9hKAXrm17ssWX0aXQ4Za2ozSsHN6c1Z0c=
Address = 10.0.0.2/32

[Peer]
PublicKey = 6F8h1/L2xwYLXe32ffBA+97pjVDsPJ7/uFkAT/OMChM=
Endpoint = <YOUR_PUBLIC_IP>:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

Add this config, application you want to reverse proxy to vps server. A nginx server is running in 192.168.254.101:80

Final config.
```txt
[Interface]
PrivateKey = 8DW1ba8GHfA9hKAXrm17ssWX0aXQ4Za2ozSsHN6c1Z0c=
Address = 10.0.0.2/32

# add this config, application you want to reverse proxy to vps server
# a nginx server is running in 192.168.254.101:80

# PostUp
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
# Nexcloud port-forward
PostUP = iptables -t nat -A PREROUTING -p tcp -i wg0 --dport 8080 -j DNAT --to 192.168.254.101:80
# PostDown
PostDown = iptables -t nat -D PREROUTING -s tcp -i wg0 --dport 8080 -j DNAT --to 192.168.254.101:80
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = 6F8h1/L2xwYLXe32ffBA+97pjVDsPJ7/uFkAT/OMChM=
Endpoint = <YOUR_PUBLIC_IP>:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

Enable and start WireGuard service.
```bash
sudo systemctl enable wg-quick@wg0.service
sudo systemctl start wg-quick@wg0.service
```



### Caddy (VPS)
My domain is hosted in Cloudflare so we'll be using `ghcr.io/caddybuilds/caddy-cloudflare:latest` image. 

*compose.yaml*
```yaml
services:
  caddy:
    image: ghcr.io/caddybuilds/caddy-cloudflare:latest
    container_name: caddy
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
    ports:
      - 80:80
      - 443:443
      - 443:443/udp
    volumes:
      - /srv/volume/caddy/Caddyfile:/etc/caddy/Caddyfile
      - /srv/volume/caddy/srv:/srv
      - /srv/volume/caddy/data:/data
      - /srv/volume/caddy/config:/config
    environment:
      - CLOUDFLARE_API_TOKEN=jn4cKIBcdYT6UqUwtQeMZPyif1IC8ATPGlv3Pwlt
    networks:
      - caddy
    labels:
      - homepage.group=Utilities
      - homepage.name=Caddy
      - homepage.icon=caddy
      - homepage.description=Open source web server with automatic HTTPS
      - homepage.widget.type=caddy
      - homepage.widget.url=http://caddy:2019
    healthcheck:

      test:
        - CMD-SHELL
        - nc -z 127.0.0.1 80 || exit 1
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
networks:
  caddy:
    name: caddy
    external: true
```
Make sure to create mount dir, for my setup it is in `/srv/volume/caddy`
```bash
mkdir /srv/volume/caddy
```
Create Caddyfile and add you Cloudflare API token, check this [post](https://learn.xbytecloud.com/t/creating-a-cloudflare-api-token-for-win-acme/151) if you haven't. 
```bash
touch /srv/volume/caddy/Caddyfile
```

*Caddyfile*
```txt
{
  admin :2019
}

*.<YOUR_DOMAIN> {

  tls {
    dns cloudflare <CLOUDFLARE_API_TOKEN>
  }

  # Add this config to tunnel your application.

  @test host test.<YOUR_DOMAIN>
  handle @test {
    reverse_proxy 10.0.0.2:8080
  }
}
```
Create docker network and start Caddy.
```bash
docker network create caddy
docker compose up -d
```
Verify.
```bash
curl https://test.marktaguiad.dev
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```
{{< imglink src="/images/self-hosted/caddy-wireguard/001.png" alt="imagen" >}}


### Docker Network
This just add complexity in your setup, but if you are cautious about security-since ports will be expose in you Host IP then I recommend this setup.

Create docker network, let's call this `wg`.
```bash
docker network create \
  --driver bridge \
  --subnet 172.30.0.0/24 \
  wg
```
Run docker application, let's use `nginx` as example.

*compose.yaml*
```yaml
services:
  app:
    image: nginx
    container_name: app

    networks:
      wg:
        ipv4_address: 172.30.0.69

networks:
  wg:
    external: true
```
In you `wg0.conf` add this. Note that you can use any `dport (8069)`, just make sure it doesn't conflict with other application you are reverse proxying. 
```txt
[Interface]
PrivateKey = 8DW1ba8GHfA9hKAXrm17ssWX0aXQ4Za2ozSsHN6c1Z0c=
Address = 10.0.0.2/32

PostUp = iptables -t nat -A PREROUTING -i wg0 -p tcp --dport 8069 -j DNAT --to-destination 172.30.0.69:80
PostUp = iptables -A FORWARD -p tcp -d 172.30.0.69 --dport 80 -j ACCEPT

PostDown = iptables -t nat -D PREROUTING -i wg0 -p tcp --dport 8069 -j DNAT --to-destination 172.30.0.69:8080
PostDown = iptables -D FORWARD -p tcp -d 172.30.0.69 --dport 8069 -j ACCEPT

[Peer]
PublicKey = 6F8h1/L2xwYLXe32ffBA+97pjVDsPJ7/uFkAT/OMChM=
Endpoint = <YOUR_PUBLIC_IP>:51820
AllowedIPs = 10.0.0.0/8
PersistentKeepalive = 25
```
In your `Caddyfile` you add.

*Caddyfile*
```txt
{
  admin :2019
}

*.<YOUR_DOMAIN> {

  tls {
    dns cloudflare <CLOUDFLARE_API_TOKEN>
  }

  # Add this config to tunnel your application.

  @web host web.<YOUR_DOMAIN>
  handle @web {
    reverse_proxy 10.0.0.2:8069
  }
}
```
