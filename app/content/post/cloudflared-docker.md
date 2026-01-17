---
title: "Reverse Tunneled Proxy with Cloudflared"
date: 2026-1-03
author: "Mark Taguiad"
tags: ["cloudflare", "docker", "network"]
TocOpen: false
UseHugoToc: true
weight: 2

TocOpen: false
---

# Reverse Tunneled Proxy with Cloudflared

If you bought your domain in Cloudflare and broke just like me, then you can enjoy some of the free privileges like cloudflared which can tunnel your application to the cloud. This also handles TLS certificate and renewal. 

# Table of Contents
1. [Requirements](#requirements)
2. [Server Setup](#server_setup)
3. [HTTPS Proxy Route](#https_proxy_route)
4. [SSH Proxy Route](#ssh_proxy_route)



### Requirements

A domain in Cloudflare and a server who has access in the internet.


### Server Setup

Navigate to your [dashboard](https://dash.cloudflare.com/), click on Zero Trust - Networks - Connectors. Now create tunnel, select type as Cloudflared. Depending on the system you're using, but in my case I will be selecting Docker. For now copy the token, like we did in Pangolin setup, we need to create a externel Docker network. 

`docker network create cloudflared-proxy`

*compose.yml*
```
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped # Restart the container unless manually stopped
    # Logging configuration for Cloudflare Tunnel container
    logging:
      driver: json-file # Use the default json-file logging driver
      options:
        max-size: 100m # Maximum log file size before rotation (100 MB)
        max-file: "10"
    healthcheck:
      test:
        - CMD
        - cloudflared
        - --version
        # Check if cloudflared version command works
      interval: 30s # Time between health check attempts
      timeout: 10s # Time to wait for a response
      retries: 3 # Number of retries before marking as unhealthy
      start_period: 10s # Delay before health checks begin
    command: tunnel --no-autoupdate run --token someverylongsecrettoken
    networks:
      - cloudflared-proxy
networks:
  cloudflared-proxy:
    name: cloudflared-proxy
    external: true
```

Spin the container and make sure it is running in the background. Check the status on your dashboard if the tunnel is now healthy. 
[![imagen](/images/cloudflared-docker/cloudflared-001.png)](/images/cloudflared-docker/cloudflared-001.png)

### HTTPS Proxy Route

Now configure on the tunnel, navigate on Published application routes. Using the jellyfin application from Pangolin setup, below is a sample configuration.

[![imagen](/images/cloudflared-docker/cloudflared-002.png)](/images/cloudflared-docker/cloudflared-002.png)


### SSH Proxy Route

Just like in the previous configuration, in here just put type to SSH. But first you need to install cloudflared on your PC or terminal. Check this [link](https://github.com/cloudflare/cloudflared) for available installation method. Onced installed, run the login command `cloudflared login`. This will automatically redirect you to your cloudflared dash to authenticate. 

[![imagen](/images/cloudflared-docker/cloudflared-003.png)](/images/cloudflared-docker/cloudflared-003.png)

Configure your ssh config.

*.ssh/config*
```
Host yourserver-ssh.yourdomain.com
  ProxyCommand cloudflared access ssh --hostname %h
  User yourUser 
  IdentityFile ~/.ssh/id_rsa
  ServerAliveInterval 240
```

Now you can ssh to your server using Cloudflare tunnel. 

`ssh root@yourserver-ssh.yourdomain.com`








