---
title: "Obsidian Cloud Vault"
date: 2025-12-27
author: "Mark Taguiad"
tags: ["obsidian", "docker", "self-hosted"]
TocOpen: false
UseHugoToc: true
weight: 2

TocOpen: false
---

# Obsidian Cloud Vault

Obsidian setup using self-hosted CouchDB or Cloudflared R2 DB. 

# Table of Contents
1. [CouchDB](#couchdb)
2. [Cloudflare R2 Database](#cloudflare_r2_database)
3. [Obsidian Setup](#obsidian_setup)



### CouchDB

This will be running on a local server and tunneled to pangolin proxy. If you are new to these, visit this [link](https://marktaguiad.dev/post/pangolin-docker/). I've setup its subdomain to *couchdb.yourdomain.com*, to access the admin page navigate to (*/_utils*) *https://ccouchdb.yourdomain.com/_utils/*.

*compose.yaml*
```
version: '3.8'

services:
  couchdb:
    image: couchdb:latest
    container_name: couchdb
    restart: always
    ports:
      - "5984:5984"
    volumes:
      - /srv/volume/couchdb/data:/opt/couchdb/data
      - couchdb_config:/opt/couchdb/etc/local.d
    environment:
      COUCHDB_USER: your_username
      COUCHDB_PASSWORD: your_password
    networks:
      - pangolin
volumes:
  couchdb_config:
networks:
  pangolin:
    name: pangolin
    external: true
```



### Cloudflare R2 Database

Go to your cloudflare dashboard and navigate to Database. Create R2 bucket, once created. Create API key to this bucket. Take note and make sure not to expose it in public domain. If you are broke like myself, free tier has a lot of limitation. Just monitor your storage from time-to-time, specially if you uploaded big files in obsidian. 

- 10 GB-month / month
- 1 million requests / month
- 10 million requests / month

### Obsidian Setup

Install the [app](https://obsidian.md/download). Navigate to setting and then enable community plugin. Then browse plugin, install *Self-hosted LiveSync*. Once installed, run the setup wizard. 
