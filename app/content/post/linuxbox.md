---
title: "Free Linux Box/Container for Development"
date: 2024-05-16
author: "Mark Taguiad"
tags: ["linux", "centos"]
ShowToc: true
TocOpen: false
UseHugoToc: true
weight: 2

TocOpen: false
---

# Free Linux Box/Container for Development

> **Update:**
> Added ingress, pointing to port 8080. You can access it using this [url](https://linuxbox.tagsdev.xyz/).

There's no catch or anything, its free. It is running as pod in my Kubernetes cluster, so you might run some issues running high level function. Currently it is running the latest CentOS 9 with hard limit of 1 cpu core and 1 GB ram. If you need more resources or open some port you can email me at marktaguiad@tagsdev.xyz. An automatic rollout/cleanup also is configured every 30th day of the month, make sure to save your work in a git repo. 

Specification:
```
os: centos 9
cpu: 1
ram: 1GB
storage: 15GB
```

Credentials:
```
user: root
password: root123
host: tagsdev.xyz
port: 2222

```

To connect:
```
ssh -p 2222 root@tagsdev.xyz
```

If you're interested in the kubernetes manifest used, check it [here](https://github.com/mcbtaguiad/linuxbox/tree/main/kube).