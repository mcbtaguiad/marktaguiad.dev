---
title: "Linux File Sharing"
date: 2025-07-02
author: "Mark Taguiad"
tags: ["linux", "nfs", "sftp", "samba", "rsync"]
# toc: true
weight: 2
TocOpen: false
UseHugoToc: true

---
Linux provides multiple file sharing and file transfer mechanisms designed for different network environments, security requirements, and performance needs. These tools support local network mounts, cross-platform interoperability, secure remote transfers, and efficient data synchronization. This blog contains concise notes on commonly used Linux file sharing protocols and utilities.

# Table of Contents
{{< toc >}}


### NFS
Network-based filesystem for Unix/Linux systems. This will allow you to share directories and files with other linux client over a network. 

#### NFS Server
First we intall the package.
```
# debian
apt-get update sudo apt install nfs-kernel-server

# centos
dnf -y install nfs-utils apt-get install nfs-kernel-server
```

Make a shared directory, some use the /mnt folder, but for this example we will be using /srv.
```
mkdir /srv/nfs-server
```

Set permission that any user on the client machine can access. 
```
chown nobody:nogroup /srv/nfs-server
chmod 777 chown nobody:nogroup /srv/nfs-server

```

Define access of NFS clients in the export file.
*/etc/exports*
```
# single ip
/srv/srv/nfs-server192.168.1.10(rw,sync,no_subtree_check)

# multiple ip
/srv/srv/nfs-server 192.168.1.10(rw,sync,no_subtree_check) \
               192.168.1.11(rw,sync,no_subtree_check)

# whole subnet
/srv/srv/nfs-server192.168.1.0/24(rw,sync,no_subtree_check)         
```

Make it available to clients.
```
exportfs -a
```

Restart service.
```
systemctl restart nfs-server
```


#### NFS Clients
In here we are to mount the NFS server created earlier. First we install the client package.
```
# debian
apt install nfs-common

# centos
dnf install nfs-utils
```

Create a local directory to mount. Let's create it in /mnt/nfs, to temporary mount it. This will not persist after reboot.
```
mount -t nfs 192.168.1.10:/srv/nfs-server /mnt/nfs
```

To unmount.
```
umount /mnt/nfs
```

To make the mount persist, we would need to use fstab. 
*/etc/fstab*
```
192.168.1.10:/srv/nfs-server /mnt/nfs  nfs  defaults  0  0
```

Field breakdown (/etc/fstab)
```
<source>              <mountpoint>  <fstype>  <options>   <dump>  <fsck>
```

Mount Options.
| Option     | Description                                      |
| ---------- | ------------------------------------------------ |
| `defaults` | rw,suid,dev,exec,auto,nouser,async               |
| `rw`       | Read-write                                       |
| `ro`       | Read-only                                        |
| `auto`     | Mount automatically at boot (`mount -a`)         |
| `noauto`   | Do not mount automatically                       |
| `exec`     | Allow binaries to execute                        |
| `noexec`   | Disallow execution                               |
| `suid`     | Allow setuid/setgid                              |
| `nosuid`   | Ignore setuid/setgid                             |
| `dev`      | Allow device files                               |
| `nodev`    | Disallow device files                            |
| `async`    | Asynchronous I/O (default)                       |
| `sync`     | Synchronous I/O                                  |
| `atime`    | Update access times                              |
| `noatime`  | Do not update access times                       |
| `relatime` | Update atime only if needed                      |
| `user`     | Allow non-root user to mount                     |
| `nouser`   | Only root can mount                              |
| `bg`       | Retry mount in background if it fails            |
| `fg`       | Retry mount in foreground                        |
| `hard`     | Retry indefinitely if server fails               |
| `soft`     | Timeout and fail on server failure               |
| `intr`     | Allow interrupts (legacy)                        |
| `nofail`   | Do not fail boot if mount fails                  |
| `_netdev`  | Network device (delay mount until network is up) |



Recommended production config.
```
192.168.1.10:/srv/nfs-server /mnt/nfs nfs rw,sync,noatime,vers=4 0 0
```

Restart client service.
```
systemctl restart nfs-client.target
```

### Samba (SMB/CIFS)
Windows-compatible network file sharing

### FTP
Standard client-server file transfer protocol

### SFTP
Encrypted file transfer over SSH

### rsync
Incremental file synchronization and backups

### S3

### SCP (legacy)
Basic secure file copy over SSH

### Docker mounted/ Direct maybe?