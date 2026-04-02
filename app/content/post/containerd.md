---
title: "Containerd"
date: 2026-03-20
author: "Mark Taguiad"
tags: ["containerd", "docker", "runc"]
UseHugoToc: true
weight: 2
---
<!-- {{< info >}} -->
<!-- If you are a native tagalog speaker then you will get why i named it "mailmoto" - mail mo ito. -->
<!-- {{< /info >}} -->
<!-- {{< imglink src="/images/linux/mailmoto/mailmoto-001.png" alt="imagen" >}} -->
Containerd is a high-performance container runtime that manages the entire container lifecycle: pulling images, running containers, handling storage, networking, and supervising processes. Originally part of Docker, it is now a CNCF project widely used in cloud-native environments.
# Table of Contents
{{< toc >}}

### Architecture
```bash
Application
   ↓
Kubernetes / Docker CLI
   ↓
containerd
   ↓
runc (OCI runtime)
   ↓
Linux Kernel
```
Containerd sits in the middle, managing containers while delegating execution to runc.
- High-level tools: Docker, Podman
- Mid-level runtime: containerd
- Low-level runtime: runc

### containerd vs Docker
| Feature        | Docker                          | containerd                  |
| -------------- | ------------------------------- | --------------------------- |
| CLI            | yes                             | no (use `ctr` or `nerdctl`) |
| Image building | yes                             | no (needs BuildKit)         |
| Runtime        | yes (uses containerd internally)| yes                          |
| Full platform  | yes                             | no (runtime-only)            |

Docker is a complete platform, containerd is a lightweight runtime engine.

### Why Containerd?
1. Separation of Concerns – Simplifies architecture, modular design.
2. Lightweight & Efficient – Lower resource use, faster container operations.
3. Kubernetes-native – Implements CRI directly, eliminating Docker shim:
```bash
kubelet → dockershim → Docker → containerd → runc

# k8s version 1.24
kubelet → containerd → runc
```

### Installation
```
# Add Docker's official GPG key:
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update

sudo apt install containerd.io
```

### Using Containerd Directly
#### ctr – low-level debugging
```
ctr images pull docker.io/library/nginx:latest

ctr images list

ctr run --rm -t docker.io/library/nginx:latest nginx

ctr containers list

ctr tasks list

ctr namespaces list
```

#### nerdctl - docker compose compatible
Compatible with compose file but expect some limitation, this is worst than podman compose - but really light weight. 
```bash
nerdctl run -d --name nginx -p 80:80 nginx

nerdctl ps -a

nerdctl logs nginx

nerdctl exec -it nginx sh

nerdctl compose up -d

nerdctl compose pull
```

### Namespaces
Containerd isolates clients by using `namespaces`. 
```bash
sudo ctr namespaces list

# k8s namespace
sudo ctr -n k8s.io containers list

# containerd namespace
sudo ctr -n moby containers list

sudo ctr -n default images list
```

### containerd vs CRI-O
Both are CRI-compliant runtimes for Kubernetes.
| Feature     | containerd      | CRI-O           |
| ----------- | --------------- | --------------- |
| Scope       | General-purpose | Kubernetes-only |
| Flexibility | High            | Minimal         |
| Use case    | Docker + K8s    | K8s only        |

