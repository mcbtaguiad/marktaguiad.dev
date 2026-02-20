---
title: "Gitea Install Notes"
date: 2026-01-06
author: "Mark Taguiad"
tags: ["gitea", "repository", "runner"]
# toc: true
weight: 2
TocOpen: false
UseHugoToc: true

---
This was my previous setup when I decided to host my own git repository, registry and pipelines. Trust me (talking to my future self) stick to github, maybe when you can afford a much powerful server. 


# Table of Contents
{{< toc >}}


### Gitea

Basic docker compose setup, run, initialized and forget. I've set the network to pangolin as we need to proxy the SSH port to another unpriviledge port in the Pangolin node. 

*compose.yaml*
```yaml
services:
  server:
    image: docker.gitea.com/gitea:1.25.3
    container_name: gitea
    environment:
      - DISABLE_REGISTRATION=true
    #  - USER_UID=1000
    #  - USER_GID=1000
    restart: always
    volumes:
      - /srv/volume/gitea:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - 3000:3000
      - 2222:22
    networks:
      - pangolin
networks:
  pangolin:
    name: pangolin
    external: true
```

### Runner

We'll be using unofficial image as we need the runner to be working as a DIND (Docker-in-Docker). The token are generated in the runner setting, make sure to check that. And since Gitea is terminated with TLS in the proxy server, set the GITEA_INSTANCE_URL to the secure endpoint. If for some reason this will be local gitea server or for internal only, look elsewhere - that's a lot of time wasted generating certificates and renewal. 

*compose.yaml*
```yaml
services:
  runner:
    image: docker.io/gitea/act_runner:nightly
    container_name: gitea-runner
    environment:
      CONFIG_FILE: /config.yaml
      GITEA_INSTANCE_URL: https://gitea.marktaguiad.dev
      GITEA_RUNNER_REGISTRATION_TOKEN: atokenyoucanfindintherunnersetting
      GITEA_RUNNER_NAME: cutenameprobably
      GITEA_RUNNER_LABELS: itscomplicated
    volumes:
      - /srv/volume/gitea-runner/config.yaml:/config.yaml
      - /srv/volume/gitea-runner/data:/data
      - /var/run/docker.sock:/var/run/docker.sock
```

### Proxy

Navigate to Pangolin and create new resources. Select type as *Raw TCP/UDP Resource*, for my setup I set the SSH proxy port to 2222. 

{{< imglink src="/images/self-hosted/gitea-madness/gitea-001.png" alt="imagen" >}}

Edit pangolin compose.yaml and add port 2222. 

*compose.yaml*
```yaml
gerbil:
    image: docker.io/fosrl/gerbil:1.3.0
    container_name: gerbil
    restart: unless-stopped
    depends_on:
      pangolin:
        condition: service_healthy
    command:
      - --reachableAt=http://gerbil:3004
      - --generateAndSaveKeyTo=/var/config/key
      - --remoteConfig=http://pangolin:3001/api/v1/
    volumes:
      - ./config/:/var/config
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    ports:
      - 51820:51820/udp
      - 21820:21820/udp
      - 443:443
      - 80:80
      - 2222:2222 # add this port
```

Add this in trefik config. 

```
tcp-2222:
    address: ":2222/tcp"
```

*config/traefik/traefik_config.yml*
```yaml
api:
  insecure: true
  dashboard: true

providers:
  http:
    endpoint: "http://pangolin:3001/api/v1/traefik-config"
    pollInterval: "5s"
  file:
    filename: "/etc/traefik/dynamic_config.yml"

experimental:
  plugins:
    badger:
      moduleName: "github.com/fosrl/badger"
      version: "v1.3.1"

log:
  level: "INFO"
  format: "common"
  maxSize: 100
  maxBackups: 3
  maxAge: 3
  compress: true

certificatesResolvers:
  letsencrypt:
    acme:
      httpChallenge:
        entryPoint: web
      email: "marktaguiad@gmail.com"
      storage: "/letsencrypt/acme.json"
      caServer: "https://acme-v02.api.letsencrypt.org/directory"

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"
    transport:
      respondingTimeouts:
        readTimeout: "30m"
    http:
      tls:
        certResolver: "letsencrypt"
      encodedCharacters:
        allowEncodedSlash: true
        allowEncodedQuestionMark: true
  tcp-2222:
    address: ":2222/tcp"

serversTransport:
  insecureSkipVerify: true

ping:
  entryPoint: "web"
```


### SSH

For small repository, you can get away by using HTTPS. But for larger file, SSH is faster. Configure your ssh config.

*~/.ssh/config*
```
Host gitea.yourserver.com
  IdentityFile ~/.ssh/id_rsa                                                                                                                                             
  ServerAliveInterval 240
  Port 2222
```


### Mirror

Mirror your github repo to your gitea instance.

*compose.yaml*
```yaml
services:
  gitea-mirror:
    image: ghcr.io/raylabshq/gitea-mirror:latest
    container_name: gitea-mirror
    restart: unless-stopped
    ports:
      - 4321:4321
    user: 0:0
    volumes:
      - /srv/hdd/volume/gitea-mirror/data:/app/data
    environment:
      # === ABSOLUTELY REQUIRED ===
      # This MUST be set and CANNOT be changed via UI
      - BETTER_AUTH_SECRET= # Min 32 chars, required for sessions
      - BETTER_AUTH_URL=https://gitea-mirror.yourserver.com
      - BETTER_AUTH_TRUSTED_ORIGINS=https://gitea-mirror.yourserver.com
      # === CORE SETTINGS ===
      # These are technically required but have working defaults
      - NODE_ENV=production
      - DATABASE_URL=file:data/gitea-mirror.db
      - HOST=0.0.0.0
      - PORT=4321
      - PUBLIC_BETTER_AUTH_URL=https://gitea-mirror.marktaguiad.dev
      # Optional concurrency controls (defaults match in-app defaults)
      # If you want perfect ordering of issues and PRs, set these at 1
      - MIRROR_ISSUE_CONCURRENCY=-3
      - MIRROR_PULL_REQUEST_CONCURRENCY=-5
    healthcheck:
      test:
        - CMD
        - wget
        - --no-verbose
        - --tries=3
        - --spider
        - http://localhost:4321/api/health
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 15s
    networks:
      - pangolin
networks:
  pangolin:
    name: pangolin
    external: true

```