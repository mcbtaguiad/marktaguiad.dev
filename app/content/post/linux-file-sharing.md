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
Windows-compatible network file sharing.
#### Samba Server
Install package.
```
apt install samba
```
Create directory to share.
```
mkdir /srv/smb
```
To add directory to share edit samba config.
*/etc/samba/smb.conf*
```
[sambashare]
    comment = Samba on Ubuntu
    path = /home/username/sambashare
    read only = no
    browsable = yes
```

Restart samba service.
```
systemctl restart samba
```
Set up a Samba password for our user account.
```
$ smbpasswd -a  sambauser

New SMB password:
Retype new SMB password:
Added user sambauser.
```

#### Samba Client
Install client package.
```
apt install cifs-utils
```

Then add this to fstab.
*/etc/fstab*
```
//SAMBA_SERVER_IP/SharedFolder  /mnt/samba_share cifs  username=USERNAME,password=PASSWORD,iocharset=utf8,vers=3.0,uid=1000,gid=1000  0  0

```

Reload and restart service.
```
systemctl daemon-reload
systemctl restart samba
```

Mount samba share.

`mount -a`


mount -a

### SFTP
Encrypted file transfer over SSH.

#### SFTP Server
Install package, this is already pre-installed with most of the distros.
```
apt install openssh-server
```

Create SFTP group and user. For this example, user and group will be sftp_user and sftp_group.
```
groupadd sftp_group
useradd -m -g sftp_group -s /sbin/nologin sftp_user
passwd sftp_user
```

Create shared directory, and set permissions.
```
mkdir -p /srv/sftp/sftp_user/upload
```

Fix permissions (no group/other write), and make upload writable by the user
```
sudo chmod 755 /srv
sudo chmod 755 /srv/sftp
sudo chmod 755 /srv/sftp/sftp_user

sudo chown sftp_user:sftp_group /srv/sftp/sftp_user/upload
sudo chmod 755 /srv/sftp/sftp_user/upload
```

Configure ssh daemon and add sftp config. Add this to the end of the file.
*/etc/ssh/sshd_config*
```
Match User sftp_user
    ChrootDirectory /srv/sftp/sftp_user
    ForceCommand internal-sftp
    AllowTCPForwarding no
    X11Forwarding no
```

Restart SSH Service.

`systemctl restart sshd`

#### SFTP Client
To test the sftp server, use this command, let's assume the IP is 192.168.254.11.

`sftp sftp_user@192.168.254.11`

To mount to fstab install this package.
```
apt install sshfs
```
Then add this in you fstab.
*/etc/fstab*
```
sftp_user@192.168.254.11:/srv/sftp/sftp_user /mnt fuse.sshfs defaults,_netdev,user,idmap=user,identityfile=/home/your_user/.ssh/id_rsa,allow_other,uid=YOUR_UID,gid=YOUR_GID 0 0
```

If you haven't copied your public key to the server, use this command.
```
ssh-copy-id sftp_user@192.168.254.11
```

Mount.
```
mount -a
```

### rsync
Incremental file synchronization and backups. This is mainly used for backup, syncing data between systems. The critical difference between other transfer service is the support for incremental file transfer that rsync provides. Incremental means it copy only file that is new or changed since the last backup or copy. 

#### rsync Command Options Table

| Option                  | Long Form              | Description                                                              |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `-a`                    | `--archive`            | Archive mode (recursive, preserves perms, symlinks, times, owner, group) |
| `-v`                    | `--verbose`            | Show progress details                                                    |
| `-z`                    | `--compress`           | Compress data during transfer                                            |
| `-h`                    | `--human-readable`     | Output numbers in human-readable format                                  |
| `-r`                    | `--recursive`          | Copy directories recursively                                             |
| `-P`                    | `--progress --partial` | Show progress and keep partially transferred files                       |
| `--delete`              | —                      | Delete files in destination not present in source                        |
| `--dry-run`             | —                      | Show what would be transferred (no changes made)                         |
| `--exclude`             | —                      | Exclude files/directories                                                |
| `--include`             | —                      | Include specific files/directories                                       |
| `--checksum`            | —                      | Skip based on checksum, not mod-time & size                              |
| `--link-dest`           | —                      | Hard-link files from another directory (useful for backups)              |
| `-e`                    | —                      | Specify remote shell (e.g., SSH)                                         |
| `--numeric-ids`         | —                      | Don’t map uid/gid by user/group name                                     |
| `--stats`               | —                      | Show detailed transfer statistics                                        |
| `--ignore-existing`     | —                      | Skip updating files that already exist                                   |
| `--inplace`             | —                      | Update destination files in-place                                        |
| `--remove-source-files` | —                      | Remove source files after transfer (move-like behavior)                  |

#### Common rsync Usage Examples
| Task               | Command                                     |
| ------------------ | ------------------------------------------- |
| Local sync         | `rsync -av source/ dest/`                   |
| Remote over SSH    | `rsync -avz source/ user@host:/path/`       |
| With progress      | `rsync -avP source/ dest/`                  |
| Mirror directories | `rsync -av --delete source/ dest/`          |
| Test run           | `rsync -av --dry-run source/ dest/`         |
| Exclude files      | `rsync -av --exclude '*.log' source/ dest/` |

#### Usual command in production environment
```
# archive directory
tar -czvf archive.tar.gz /path/to/directory

rsync -avzHP archive.tar.gz /backup_directory
rsync -avzHP archive.tar.gz root@backup_host
```

- a — Archive mode used to copy files recursively while preserving symbolic links, file permissions and ownership, and timestamps.
- v — Verbose mode to get more detailed information on the file transfer process.
- z — Enable file compression. This option can be omitted when transferring files locally but is incredibly useful when sending data over the network to reduce the amount of it transmitted.
- H — Preserve hard links.
- P — Show the progress of the data transfer.
–dry-run or -n – Perform a trial run without making any changes.

### S3
There are many ways to selfhost your own s3, some example are cephfs, minIO, seewedfs etc. But here we will just be mounting s3 bucket to our linux server or pc. You can start with creating a free account in AWS to create a free s3 bucket. Assuming you have already created a bucket, you now have a bucket name, uri, access_key and secret_access_key. Now to mount it in your system. 

Install s3fs-fuse.
```
apt install s3fs
```
Create a directory to mount s3 bucket.

`mkdir /mnt/s3-bucket`

To temporary mount it. Create credentials in /etc/s3-credential and set permission.

```
echo ACCESS_KEY:SECRET_ACCESS_KEY > /etc/s3-credential

chmod 600 /etc/s3-credential

```
Mount bucket. This will work if you are using AWS. 

`s3fs bucket_name /mnt/s3-bucket -o passwd_file=/etc/s3-credential`

But if you are using other storage service, then you may need to specify the uri. 
```
s3fs bucket_name /mnt/s3-bucket \
  -o passwd_file=/etc/s3-credential \
  -o url=https://yourid.r2.cloudflarestorage.com \
  -o use_path_request_style \
  -o allow_other \
  -o nonempty \
  -o multipart_size=52 \
  -o parallel_count=15
```

- use_path_request_style - needed if not using aws
- nonempty - optional, only if the mount dir isn’t empty
- multipart_size - size (in MB) of each multipart upload chunk
- parallel_coun - multipart chunks uploaded simultaneously

To make it persistent, mount it using fstab.
*/etc/fstab*
```
bucket_name /mnt/s3-bucket fuse.s3fs _netdev,allow_other,passwd_file=/etc/s3-credential,url=https://yourid.r2.cloudflarestorage.com,use_path_request_style,multipart_size=52,parallel_count=15 0 0
```

Enable *allow_other*.
*/etc/fuse.conf*
```
# uncomment
user_allow_other
```

`mount -a`