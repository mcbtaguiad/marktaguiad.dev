---
title: "003 Homepage"
date: 2023-05-28
title: "Homepage - A highly customizable dashboard for docker and kubernetes cluster"
date: 2023-05-27
author: "Mark Taguiad"
tags: ["self-hosted", "docker", "k8s", "kubernetes"]
ShowToc: true
TocOpen: false
UseHugoToc: true
weight: 2

TocOpen: false
---

Looking for flashy and dynamic dashboard to organized your websites and self-hosted application running on your cluster/server? Checkout [homepage](https://github.com/benphelps/homepage/tree/main)!

### Homepage Core Features
- Docker integration
- Kubernetes integration
- Service Integration
- Various widgets

### Experience with Homepage

It's easy to install and configure, with docker you may need to mount the config but with kubernetes it can be configured by using config maps. This has been my [dashboard](https://dashboard.tagsdev.click) for quite sometime now and every websites and application deployed is added. 

It has a quick integration using annonation with ingress, here is a sample. With this example, this application/website is added automatically to "Links" groups.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tagsdev-hugo-ingress
  annotations:
    gethomepage.dev/description: "TagsDev | Mark Taguaid"
    gethomepage.dev/enabled: "true"
    gethomepage.dev/group: Links
    gethomepage.dev/icon: https://raw.githubusercontent.com/mcbtaguiad/web-tagsdev-hugo/main/app/static/images/fa-tags-nobg.png
    gethomepage.dev/name: TagsDev
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
      - tagsdev.click
    secretName: tagsdev-hugo-tls
  rules:
  - host: tagsdev.click
    http:
      paths:
      - path: /
        #pathType: ImplementationSpecific
        pathType: Prefix
        backend:
          service:
            name: web-tagsdev
            port:
              number: 8080
```

### Install Homepage with Docker
Installing it is easy! Just use docker-compose/podman-compose.
```yaml
version: "3.3"
services:
  homepage:
    image: ghcr.io/benphelps/homepage:latest
    container_name: homepage
    ports:
      - 3000:3000
    volumes:
      - /path/to/config:/app/config # Make sure your local config directory exists
      - /var/run/docker.sock:/var/run/docker.sock:ro # (optional) For docker integrations

```

### Install Homepage with Kubernetes
I haven't found helm file yet for homepage, so here's my yaml file.

```