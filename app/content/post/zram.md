---
title: "Making my Edge Linux Server Faster with ZRAM"
date: 2026-03-27
author: "Mark Taguiad"
tags: ["linux", "zram"]
UseHugoToc: true
weight: 2
---
ZRAM is a compressed block device that lives in RAM. It allows the system to store data in memory in a compressed form instead of pushing it to disk swap.

In simple terms:
- It acts like swap
- But stays in RAM
- And compresses data to fit more

This means faster access times and less reliance on slow disk I/O.
# Table of Contents
{{< toc >}}

### The Problem
I'm running my docker [mail](https://github.com/mcbtaguiad/mailmoto/tree/main) stack and Pangolin Reverse Proxy, this eats up RAM when a high volume of email hits the server and the RSPAM evaluate the email sents. And also from traffic forwarded by my local servers going to the Pangolin Reverse Proxy - an upgrade would be the absolute fix but ZRAM would slightly help with the RAM shortage. 

### Setup
#### Install
```bash
sudo apt update
sudo apt install zram-tools
```

#### Configuration
Edited the default configuration file.
```bash
sudo vim /etc/default/zramswap
```
Then set:
```
ALGO=lz4
PERCENT=75
PRIORITY=100
```
- ALGO=lz4 - fast compression (recommended)
- PERCENT=75 - ZRAM = 75% of RAM
- PRIORITY=100 - higher than disk swap

Other compression algorithms.
| Algorithm | Speed       | Compression        |
| --------- | ----------- | ------------------ |
| lz4       |  Fast     | Medium             |
| zstd      |  Balanced | Better compression |
| lzo       | Fast        | Lower compression  |

Restart service.
```bash
sudo systemctl restart zramswap
```
#### Verify
ZRAM device `/dev/zram0` is created. 
```
fdisk -l | grep zram
Disk /dev/zram0: 721.13 MiB, 756154368 bytes, 184608 sectors
Units: sectors of 1 * 4096 = 4096 bytes
Sector size (logical/physical): 4096 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes
```

```bash
zramctl 
NAME       ALGORITHM DISKSIZE  DATA  COMPR TOTAL STREAMS MOUNTPOINT
/dev/zram0 lz4         721.1M  2.8M 884.4K  2.4M       1 [SWAP]

zramctl --output-all
NAME       DISKSIZE  DATA  COMPR ALGORITHM STREAMS ZERO-PAGES TOTAL MEM-LIMIT MEM-USED MIGRATED MOUNTPOINT
/dev/zram0   721.1M  2.8M 884.4K lz4             1         59  2.4M        0B     2.4M       0B [SWAP]
```

```bash
swapon --show
NAME       TYPE        SIZE   USED PRIO
/dev/vda3  partition   512M 310.8M   -2
/dev/zram0 partition 721.1M   2.7M  100
```

#### Swappiness
Adjust how aggressively Linux swaps.
```bash
sysctl vm.swappiness=80
```
Make it persist even after reboot. 
```bash
echo "vm.swappiness=80" | sudo tee -a /etc/sysctl.conf
```
Higher value means more use of ZRAM.



