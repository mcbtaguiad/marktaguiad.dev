---
title: "Linux Network Services"
date: 2025-06-20
author: "Mark Taguiad"
tags: ["linux", "ntp", "ssh", "selinux", "apache"]
# toc: true
weight: 2
TocOpen: false
UseHugoToc: true

---


# Table of Contents
{{< toc >}}


To do
- network services, like dns server, dhcp server, 

### Configuring SSH

#### Install
Some distro don't include ssh server out of the box, or you forgot to check the option in the installation process. 

```bash
# debian base
sudo apt install openssh-server -y

# fedora/redhat
sudo dnf install -y openssh-server

systemctl enable --now ssh # or sshd depending on the distro
```

#### Copying key to Server
Before we disable password login to the server we need to add our public key in the server. If you haven't generated your key. Keys are located at */home/yourusername/.ssh*.
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"

# If you are using a legacy system that doesn't support the Ed25519 algorithm, use:
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

Now you can manually add it to server by login in and pasteing it to `/home/user/serveruser/.ssh/authorized_keys`. For root it is /root/.ssh/authorized_keys.

Copying key by command through remote access. On your pc or terminal run the command below, this will ask for the user password. 
```bash
$ ssh-copy-id root@serverIPorDNS
```

#### Hardening SSH Server

- Disable root login
- Disable password login
- Allow specific users only to log in on SSH
- Configure a nondefault port for SSH to listen on

Open file /etc/ssh/sshd_config. 
```
PermitRootLogin no # disable root login

PasswordAuthentication no # disable password login

AllowUsers bonifacio luna

DenyUsers jose

Port 22 # change ssh port
```

To take effect restart service. 

```bash
systemctl restart 
# or for openrc
sudo rc-service ssh restart
```

#### Managing SElinux to Allow SSH port Change

Add the new port to the SELinux policy.

```bash
semanage port -a -t ssh_port_t -p tcp PORTNUMBER

# to verify
sudo semanage port -l | grep ssh 

# restart service
sudo systemctl restart ssh
```

### Apache Web Server
I'm a Nginx guy, but apache is good for legacy application. Specially if you have handled application from big company that don't want to upgrade to latest technology.

#### Install apache.

```bash
# debian basee
apt install apache2

# centos base
dnf install httpd

```

Start the Apache service and enable it to run on .
```bash
systemctl enable --now apache2

# or

systemctl enable --now httpd
```

#### Key Terminology
- Virtual Hosts: Enable a single server to host multiple websites by routing incoming requests to different directories based on the requested domain name.

- Document Root: The main directory that contains your website’s files. On most Linux systems, this defaults to /var/www/html.

- Modules: Apache can be extended with optional modules that add or enhance functionality. Common examples include mod_ssl for enabling HTTPS and mod_rewrite for URL rewriting.

- Configuration Files: Apache is configured through files such as apache2.conf (or httpd.conf on some distributions), along with .htaccess files that apply settings at the directory level.


#### Creating First Website

Navigate to document root */var/www/html*. Create a simple html. 

*index.html*
```html
<html>
<!-- <h2>  </h2> -->
<h3>My First Website</h3>
<p>Look at me Mom I'm a DevOps.</p>
```

You can use curl or use a web browser to check. 
```
$ curl localhost
<html>
<!-- <h2>  </h2> -->
<h3>My First Website</h3>
<p>Look at me Mom I'm a DevOps.</p>
```
[![imagen](/images/linux/linux-network-services-001.png)](/images/linux/linux-network-services-001.png)

#### Main Configuration Files

Apache’s behavior is managed through a set of core configuration files, each serving a specific purpose:
- apache2.conf (or httpd.conf on some systems): The primary configuration file where global settings and defaults are defined.

- ports.conf: Specifies which ports Apache listens on for incoming connections.

- sites-available/: Contains configuration files for individual websites, defining how each site should be served.

- sites-enabled/: Holds symbolic links to the site configurations in sites-available that are currently enabled and active.

- .htaccess: A per-directory configuration file that allows overriding certain Apache settings without modifying the main configuration files. It is commonly used for URL rewriting, access control, and custom error handling, provided that AllowOverride is enabled.

#### Implementing a Basic .htaccess for Redirects

Create a .htaccess on your document root.

*.htaccess*
```
Redirect 301 /old-page http://example.com/new-page
```

Test the redirect on your browser.

#### Hosting Multiple Website
Now lets create two website running in one server. Create the document root.
```bash
mkdir -p /var/www/website1 /var/www/website2
```

Create index.html for both document root.
```html
<html>
<h3>Website 1</h3> <!-- Change this to 2 in website 2 -->
<p>Look at me Mom I'm a DevOps.</p>
```

Create virtual host configuration file. Note that in debian base distro, it is using different folder */etc/apache2/sites-available*. 
```bash
touch /etc/httpd/conf.d/website1.conf /etc/httpd/conf.d/website2.conf
```

*/etc/httpd/conf.d/website1.conf*
```conf
<VirtualHost *:80>
    ServerName website1.local
    ServerAlias www.website1.local

    DocumentRoot /var/www/website1

    <Directory /var/www/website1>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/website1_error.log
    CustomLog ${APACHE_LOG_DIR}/website1_access.log combined
</VirtualHost>
```

*/etc/httpd/conf.d/website2.conf*
```conf
<VirtualHost *:80>
    ServerName website2.local
    ServerAlias www.website2.local

    DocumentRoot /var/www/website2

    <Directory /var/www/website2>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/website2_error.log
    CustomLog ${APACHE_LOG_DIR}/website2_access.log combined
</VirtualHost>
```

Enable the sites.
```bash
# debian base
sudo a2ensite website1.conf
sudo a2ensite website2.conf
sudo systemctl reload apache2

# in centos base, it is automatically loaded in conf.d folder.
```

Reload apache service.
```bash
systemctl reload apache2
# or
systemctl relaod httpd
```

#### SSL Termination
To save you from headache look up Let’s Encrypt to generate your certificate, assuming you have a purchase a domain and have access to public IP. Or better yet, migrate your domain to Cloudflare and use their tunnel service. 

Let's assume you have a valid certificate, we can now terminate your website with TLS. First enable ssl module. 
```bash
# debian 
a2enmod ssl
# centos
dnf install -y mod_ssl
```

Let's Encrypt certifacate path usually at */etc/letsencrypt/live/website.domain/*. Edit website1 config.
*/etc/httpd/conf.d/website1.conf*
```conf
<VirtualHost *:443>
    ServerName website1.example.com
    ServerAlias www.website1.example.com

    DocumentRoot /var/www/website1

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/website1.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/website1.example.com/privkey.pem

    <Directory /var/www/website1>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog /var/log/httpd/website1_ssl_error.log
    CustomLog /var/log/httpd/website1_ssl_access.log combined
</VirtualHost>
```

Reload service.
```bash
systemctl reload apache2
# or
systemctl reload httpd
```

#### Reverse Proxy
A reverse proxy is a server that sits in front of one or more backend servers and forwards client requests to them. Clients communicate only with the reverse proxy, not directly with the backend services.

Instead of users accessing an application server directly, they access the reverse proxy, which then decides where and how to send the request.

In our example, the backend service will be a container on port 8080, we will terminate it using apache2 reverse proxy. 

First install module.
```bash
# debian
a2enmod ssl
a2enmod proxy
a2enmod proxy_http
a2enmod headers

# centos
dnf install -y httpd mod_ssl mod_proxy mod_proxy_http
```

Create configuration file and edit.
*/etc/httpd/conf.d/app-ssl.conf*
```conf
<VirtualHost *:443>
    ServerName app.example.com

    # TLS
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/app.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/app.example.com/privkey.pem

    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off

    # Forward client info to container
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
    RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s

    # Proxy to Docker container
    ProxyPass / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/

    ErrorLog /var/log/httpd/app_ssl_error.log
    CustomLog /var/log/httpd/app_ssl_access.log combined
</VirtualHost>
```

For debian, create config in */etc/apache2/sites-available/app-ssl.conf*. And enable the sites.
```bash
a2ensite app-ssl.conf
```

Reload service.
```bash
systemctl reload apache2
# or
systemctl reload httpd
```

### NTP - Network Time Protocol
NTP and is used to correct the time difference between the local system and the clock source server. On older *ntpd* is used, but now both has migrated to chrony. 
#### Run as a Service
Install chrony (usually already installed).
```bash
dnf install chrony
apt install chrony
```
Configure NTP servers, search the nearest ntp server available. For me this would be Philippines.
*/etc/chrony.conf*
```conf
server 0.ph.pool.ntp.org
server 1.ph.pool.ntp.org
server 2.ph.pool.ntp.org
server 3.ph.pool.ntp.org
```
Save and start service.
 
`systemctl restart chronyd`


Verify sync.
```bash
chronyc sources -v
chronyc tracking
```

#### Run as a Server
To run as a server just add this line in the configuration. 
*/etc/chrony.conf*
```conf
server 0.ph.pool.ntp.org
server 1.ph.pool.ntp.org
server 2.ph.pool.ntp.org
server 3.ph.pool.ntp.org

# Allow clients 
allow 0.0.0.0/0 # ipv4
allow ::/0 # ipv6

# Act as fallback time source if upstream is unreachable
local stratum 10

```
Save and start service.
 
```bash
systemctl restart chronyd
```

