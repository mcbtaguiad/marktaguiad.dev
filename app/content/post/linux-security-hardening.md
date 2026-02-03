---
title: "Linux Security & Hardening"
date: 2025-07-26
author: "Mark Taguiad"
tags: ["linux", "selinux", "security", "fail2ban"]
# toc: true
weight: 2
TocOpen: false
UseHugoToc: true

---

# Table of Contents
{{< toc >}}

### SSH hardening
SSH is one of the most targeted services on any server exposed to a network. Hardening SSH reduces the attack surface, limits brute-force attempts, and enforces stronger authentication and cryptography.
#### Core Configuration
*/etc/ssh/sshd_config*
```
# disable legacy, and use modern protocol
Protocol 2

# disable direct root login
PermitRootLogin no

# use only key-bared authentication
PasswordAuthentication no
AuthenticationMethods publickey

# restrict allowed users
AllowUsers user1 user2

# change default port
Port 2222

# enable Multi-Factor Authentication
AuthenticationMethods publickey,keyboard-interactive

# allow only strong ciphers
Ciphers aes256-ctr,aes192-ctr,aes128-ctr

# limit concurrent sessions
MaxSessions 3

# automaticalyy disconnect ssh sessions
ClientAliveInterval 300
ClientAliveCountMax 0
```

#### Monitoring
Regularly inspect SSH logs to detect suspicious behavior. Common log locations:
- /var/log/auth.log
- journalctl -u ssh

#### Optional Enhancement
- Separate SSH acces to internal network only
- Restrict SSH acces by IP through firewall rules
- Update openssh package regularly


### Fail2ban
Fail2Ban is a log-monitoring intrusion prevention tool that watches log files for suspicious behavior (like repeated failed logins) and automatically blocks offending IPs by updating firewall rules.
- Protects against brute-force attacks (e.g., SSH login attempts).
- Works even if password auth is disabled (it still reduces noise and resource waste).
- Blocks bad actors automatically with customizable actions.

#### Installation
```
apt install fail2ban
```

#### Configuration
Fail2ban ships with default config, copy them so that we won't overwrite the default config.
```
cp /etc/fail2ban/fail2ban.conf /etc/fail2ban/fail2ban.local
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

First make sure to white list your IP address (public and priavte).
*/etc/fail2ban/jail.local*
```
ignoreip = 127.0.0.1/8 ::1 192.168.1.10 203.0.113.45 10.0.0.0/8 192.168.1.0/24
```

Enable Extended Banning, this watches fail2ban logs */var/log/fail2ban.log* for recurring offebses. Enabling this can significantly increases security against persistent brute-force attacks.

*/etc/fail2ban/jail.local*
```
[recidive]
enabled    = true
logpath    = /var/log/fail2ban.log
banaction  = %(banaction_allports)s
bantime    = 1w
findtime   = 1d
```

Restart service after making changes.

`systemctl restart fail2ban`

#### Status
To show active jails.
```
fail2ban-client status
```

Check details for *sshd*.
```
fail2ban-client status sshd
```

You can also ehecked from iptables, rules automatically created by fail2ban.

`iptables -n -L`


#### Unbanning IP
Let's say you got banned for stupid reason like I did. You can login with other IP or maybe use your phone, and then unban your IP. 

```
fail2ban-client set <jailname> unbanip <IP_ADDRESS>

# examples
fail2ban-client set sshd unbanip 1.2.3.4
fail2ban-client set recidive unbanip 1.2.3.4
```

Better yet, install VPN to your server and white list the subnet used.

### SELinux
SELinux (Security-Enhanced Linux) is a **mandatory access control (MAC)** system built into the Linux kernel.  
Every process, file, port, and other system object has a **security label** that includes a **type**. Policy rules determine what each process type is allowed to do with each object type.  
Unlike traditional Linux permissions (owner/group + rwx), SELinux **does not depend on UIDs** — it enforces access based on these labels. :contentReference[oaicite:1]{index=1}

#### Mode Definitions

| Mode | Definition | Behavior | Use Case |
|------|------------|----------|----------|
| **Enforcing** | SELinux actively enforces policy rules | Denies access that violates policy; logs AVC denials | Production systems; full security enforcement |
| **Permissive** | SELinux logs policy violations but does not block them | Access that would normally be denied is allowed; AVC denials are still recorded | Troubleshooting, debugging, testing policies |
| **Disabled** | SELinux is completely turned off | No policy enforcement; no logging | Rarely used; system completely unprotected by SELinux |

| Mode | Policy enforced? | Access denied? | AVC logged? |
|------|-----------------|----------------|-------------|
| Enforcing | ✅ Yes | ✅ Yes | ✅ Yes |
| Permissive | ✅ Yes | ❌ No | ✅ Yes |
| Disabled | ❌ No | ❌ No | ❌ No |

#### Labels and Policy
- Each **process runs in a domain** (a type) — e.g., the SSH daemon (`sshd`) runs in the `sshd_t` domain, and the Apache web server runs in the `httpd_t` domain.  
- Each file or directory has a **type** label — e.g., web content might be labeled `httpd_sys_content_t`.  
- SELinux policy rules (`allow` statements) explicitly state which domains can access which object types. :contentReference[oaicite:2]{index=2}


> All access is **denied by default** until a rule specifically allows it.

You can check this using command *ls -Z*.
```
$ ls -lZ
total 24
dr-xr-xr-x.   1 root root system_u:object_r:mnt_t:s0            0 Jul 30  2025 afs
lrwxrwxrwx.   1 root root system_u:object_r:bin_t:s0            7 Jul 30  2025 bin -> usr/bin
drwxr-xr-x.   6 root root system_u:object_r:boot_t:s0        4096 Oct 23 03:53 boot
-rw-rw-r--.   1 root root system_u:object_r:etc_runtime_t:s0   71 Oct 23 03:52 config.partids
drwxr-xr-x   18 root root ?                                  3740 Feb  3 05:17 dev
drwxr-xr-x.   1 root root system_u:object_r:etc_t:s0         2660 Jan 31 07:01 etc
drwxrwxr-x.   1 root root system_u:object_r:default_t:s0       10 Oct 23 03:53 grub2
drwxr-xr-x.   1 root root system_u:object_r:home_root_t:s0     38 Jan 31 07:00 home
lrwxrwxrwx.   1 root root system_u:object_r:lib_t:s0            7 Jul 30  2025 lib -> usr/lib
lrwxrwxrwx.   1 root root system_u:object_r:lib_t:s0            9 Jul 30  2025 lib64 -> usr/lib64
drwxr-xr-x.   1 root root system_u:object_r:mnt_t:s0            0 Jul 30  2025 media
drwxr-xr-x.   1 root root system_u:object_r:mnt_t:s0            0 Jul 30  2025 mnt
drwxr-xr-x.   1 root root system_u:object_r:usr_t:s0            0 Jul 30  2025 opt
dr-xr-xr-x  207 root root ?                                     0 Feb  3 05:17 proc
dr-xr-x---.   1 root root system_u:object_r:admin_home_t:s0   246 Feb  3 05:17 root
drwxr-xr-x   36 root root ?                                   900 Feb  3 05:17 run
lrwxrwxrwx.   1 root root system_u:object_r:bin_t:s0            8 Jul 30  2025 sbin -> usr/sbin
drwxr-xr-x.   1 root root unconfined_u:object_r:default_t:s0    0 Jan 31 07:16 sftp
drwxr-xr-x.   1 root root system_u:object_r:var_t:s0            8 Jan 31 07:01 srv
dr-xr-xr-x   13 root root ?                                     0 Feb  3 09:18 sys
drwxrwxrwt   10 root root ?                                   200 Feb  3 05:57 tmp
drwxr-xr-x.   1 root root system_u:object_r:usr_t:s0          100 Oct 23 03:50 usr
drwxr-xr-x.   1 root root system_u:object_r:var_t:s0          170 Oct 23 03:52 var
```

#### Type Enforcement
- The `httpd_t` domain is allowed to read and serve files labeled `httpd_sys_content_t`.  
- The `sshd_t` domain is allowed to read SSH configs and manage SSH sessions.  
- Without explicit rules, processes can’t cross boundaries — e.g., `httpd_t` can’t read SSH host keys just because Unix file permissions allow it. :contentReference[oaicite:3]{index=3}
- Even if sshd is compromised, it cannot suddenly start serving web pages or reading Apache files, because SELinux doesn’t allow sshd_t to do what httpd_t does.
- In short, SELinux doesn’t just care who you are (user/group)—it cares what you are (sshd, httpd, etc.) and enforces behavior based on that role. Each service is boxed into its own lane, and crossing lanes is blocked unless there’s an explicit rule allowing it.

#### MCS Enforement 
MCS (Multi-Category Security) is used to **isolate processes that share the same SELinux type** so they cannot access each other’s data. MCS does **not** create a hierarchy. Access is allowed **only when category labels match exactly**.

To further explain this, let's assume we have httpd running two website. same service, same type, almost the same labels and run on the same system but must be isolated from each other.

Type enforcement alone is not enough because:
- Both sites run as `httpd_t`
- Both serve web content
- Both need similar permissions

MCS adds **category labels** to separate them. Here is a scenario of two websites on one httpd server.
- Website A → `site_a`
- Website B → `site_b`

Both run at level `s0`, but with **different categories** *c1* and *c2*.
**Process Context**
```
httpd → system_u:system_r:httpd_t:s0
```
**File Lables**
```
/var/www/site_a → system_u:object_r:httpd_sys_content_t:s0:c1
/var/www/site_b → system_u:object_r:httpd_sys_content_t:s0:c2
```
The labels are almost identical:
- Same user
- Same role
- Same type
- Same level (`s0`)
- Only the **category differs**

MCS enforcement allowed httpd to read files in `site_a` labeled `c1`, and `site_b` labeled `c2`. 
Basically, httpd cans server **site_a** when operating in context **s0:c1**, httpd cans server **site_b** when operating in context **s0:c2**. Apache cannot read **c1** content while operating as **c2**, and vice versa. SeLinux treats this as a separate httpd instance, even though it's the same binary. 

To have give more context on this subject, MCS enforement is commonly used for:
- Containers
- Virtual Machines
- Sandboxed services
- Multi-tenant systems

#### MLS Enforcement
MLS (Multi-Level Security) enforces who can access higher or lower classified data. MLS has hierchy and rules follow clerance leves. So even if the system is compromised, how far up or down are you allowed to see. 

Core MLS rules (Bell–LaPadula):
- No read up
- No write down

To demostrate this, let's assume three VMs with different trust levels
| Level | Meaning  |
| ----- | -------- |
| `s0`  | Public   |
| `s1`  | Internal |
| `s2`  | Secret   |

VM labeling (host-enforced). Each VM’s disk, memory, and devices are labeled at the same level.
```
VM Public     → system_u:system_r:virt_t:s0
VM Internal   → system_u:system_r:virt_t:s1
VM Secret     → system_u:system_r:virt_t:s2
```
Scenario: VM Internal is compromised, attacker gains root access insite **VM Internal (s1)**. Using the rule set by MLS (no read up, no write up), the attacker read and write access:

|       |   Read   |  Write   |
| ----- | -------- | -------- |
| `s0`  |   yes    |   yes    |       
| `s1`  |   yes    |   no     |
| `s2`  |   no     |   no     |


#### SELinux Enforcement Comparison

| Enforcement               | What it Controls       | Core Question It Answers                                 | Example                                       |
| ------------------------- | ---------------------- | -------------------------------------------------------- | --------------------------------------------- |
| **DAC** (Linux perms)     | Users & groups         | *Does this user have rwx permission?*                    | `root` can read `/etc/shadow`                 |
| **Type Enforcement (TE)** | Process ↔ object types | *Is this service allowed to access this kind of object?* | `httpd_t` can read `httpd_sys_content_t`      |
| **MCS**                   | Category isolation     | *Is this the correct instance/workload?*                 | Website A (`c1`) cannot read Website B (`c2`) |
| **MLS**                   | Security levels        | *Is this subject trusted enough?*                        | `s1` cannot read `s2` (no read up)            |


#### Configuration

To change SELinux mode. 
```
# set to enforcing
setenforce 1

# set to permissive
setenforce 0
```
To fully disable SELinux edit */etc/selinux/config*, and set SELINUX to disabled. Permissive and Enforcing can also be set using this method. 
```
# disabled, permissive, enforcing

SELINUX=disabled
```
To check for status

`getenforce`
 
#### Example
To understand (fully maybe? well this is my note for my dumb self) SELinux, let's enforce service like httpd. 

Install and start service.
```
$ dnf install httpd

$ systemctl enable --now httpd
$ systemctl status httpd

● httpd.service - The Apache HTTP Server
     Loaded: loaded (/usr/lib/systemd/system/httpd.service; enabled; preset: disabled)
    Drop-In: /usr/lib/systemd/system/service.d
             └─10-timeout-abort.conf
     Active: active (running) since Tue 2026-02-03 12:02:57 UTC; 4s ago
 Invocation: 263a11e3e94149379fb7cd6db909c0f9
       Docs: man:httpd.service(8)
   Main PID: 1268 (httpd)
     Status: "Started, listening on: port 80"
      Tasks: 177 (limit: 4617)
     Memory: 14.2M (peak: 14.2M)
        CPU: 113ms
     CGroup: /system.slice/httpd.service
             ├─1268 /usr/sbin/httpd -DFOREGROUND
             ├─1269 /usr/sbin/httpd -DFOREGROUND
             ├─1270 /usr/sbin/httpd -DFOREGROUND
             ├─1271 /usr/sbin/httpd -DFOREGROUND
             └─1272 /usr/sbin/httpd -DFOREGROUND
```

Default root documentn will be at `/var/www/html`. Let' create `index.html` and check the security context of the file.
*index.html*
```
<html>
<h3>My website</h3> <!--  -->
<p>Look at me Mom I'm a DevOps.</p>
```
```
$ ls -lZ /var/www/html/
total 4
-rw-r--r--. 1 root root unconfined_u:object_r:httpd_sys_content_t:s0 73 Feb  3 12:07 index.html
```
The httpd_sys_content_t is the default allowed file type for the httpd process. If a file or directory has this file type in its SELinux security context, the httpd process can access it. 

Now let's create a new html file, navigate to `/root` and create a `test.html`. Then move the file to document root `/var/www/html`. 
```
$ cd /root
$ cat /var/www/html/index.html > test.html
$ cat test.html
<html>
<h3>My website</h3> <!--  -->
<p>Look at me Mom I'm a DevOps.</p>
$ mv test.html /var/www/html/
$ ls -lZ
total 8
-rw-r--r--. 1 root root unconfined_u:object_r:httpd_sys_content_t:s0 73 Feb  3 12:07 index.html
-rw-r--r--. 1 root root unconfined_u:object_r:admin_home_t:s0        73 Feb  3 12:28 test.html
```
We can that the file keep its old label, type is still `admin_home_t`. If we curl the page we get:
```
$ curl localhost/test.html
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html><head>
<title>403 Forbidden</title>
</head><body>
<h1>Forbidden</h1>
<p>You don't have permission to access this resource.</p>
</body></html>
```
But if we copy the file, security context are updated to `httpd_sys_content_`. This can also easily fix with `restorecon` command. 
```
$ restorecon -R /var/www/html
$ ls -lZ
total 8
-rw-r--r--. 1 root root unconfined_u:object_r:httpd_sys_content_t:s0 73 Feb  3 12:07 index.html
-rw-r--r--. 1 root root unconfined_u:object_r:httpd_sys_content_t:s0 73 Feb  3 12:28 test.html
```

Now we change the custom root document of httpd, copy `/var/www/html` to `/srv/web`. Edit httpd config and change document root to `/srv/web`.
```
$ mkdir -p /srv/web
$ cp -r /var/www/html/ /srv/web
$ vim /etc/httpd/conf/httpd.conf
```

If we use restorecon in the new directory notice that no change would apply. 
```
$ restorecon -R /srv/web/
$ ls -lZ
total 8
-rw-r--r--. 1 root root unconfined_u:object_r:var_t:s0 73 Feb  3 13:04 index.html
-rw-r--r--. 1 root root unconfined_u:object_r:var_t:s0 73 Feb  3 13:04 test.html
```

To fix this issue, we need to update the SELinux database. The following command attaches the file type httpd_sys_content_t to the /srv/web directory. If command is missing, install `policycoreutils-python-utils` package.

```
$ semanage fcontext -a -t httpd_sys_content_t "/srv/web(/.*)?"
$ restorecon -Rv /srv/web
$ ls -lZ
total 8
-rw-r--r--. 1 root root unconfined_u:object_r:httpd_sys_content_t:s0 73 Feb  3 13:04 index.html
-rw-r--r--. 1 root root unconfined_u:object_r:httpd_sys_content_t:s0 73 Feb  3 13:04 test.html
```

Now to check we can curl the website. 
```
$ curl localhost/test.html
<html>
<h3>My website</h3> <!--  -->
<p>Look at me Mom I'm a DevOps.</p>
```

We can also change the default port for httpd. Edit `/etc/httpd/conf/httpd.conf` and change listening port to `Listen 8080`. Check existing http port.
```
$ semanage port -l | grep http
http_cache_port_t              tcp      8080, 8118, 8123, 10001-10010
http_cache_port_t              udp      3130
http_port_t                    tcp      80, 81, 443, 488, 8008, 8009, 8443, 9000
http_port_t                    udp      80, 443
pegasus_http_port_t            tcp      5988
pegasus_https_port_t           tcp      5989
```

Now we change the default port to 8080 and restart httpd service

```
semanage port -m -t http_port_t -p tcp 8080
systemctl restart httpd
```
Verify.
```
$ curl http://localhost:8080
<html>
<h3>My website</h3> <!--  -->
<p>Look at me Mom I'm a DevOps.</p>
```
> [!Note]
> I'll update this section when I get the time to read all about SELinux. Makaulaw basbasaen aytoy. 

### Firewall
[Look at this post.](/post/linux-network/#firewall)