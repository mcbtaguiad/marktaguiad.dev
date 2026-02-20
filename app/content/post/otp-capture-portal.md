---
title: "OTP Capture Portal"
date: 2026-02-13
author: "Mark Taguiad"
tags: ["openwrt", "nodogsplash", "capture-portal", "otp"]
UseHugoToc: true
weight: 2
---
<!-- > [!INFO]
> This project is a fork from [user2684/otpspot](https://github.com/user2684/otpspot) repo.  -->

{{< note >}}
This project is a fork from [user2684/otpspot](https://github.com/user2684/otpspot) repo.
{{< /note >}}


{{< imglink src="/images/web/otp-capture-portal/otp-capture-portal-001.png" alt="imagen" >}}

In deploying capture portal solution to client, I usually use OpenNDS and OpenWrt, or simply TP-Link Omada Controller. Due to hardware limitation, we will be using nodogsplash on OpenWrt connected to a external server that will handle the authentication. Instead of common voucher generation, it will be generated using OTP. Thanks to [user2684](https://github.com/user2684) solution. 

Repo for this blog - [link](https://github.com/mcbtaguiad/otp-capture-portal).

# Table of Contents
{{< toc >}}

### What's new?
Not too much was added, I strictly set the deployment to Docker. Added an admin page that shows newly generated OTP - code and QR for easy input. I also added background and logo which can be dynamically change (docker mount) - this will be helpful for deployment for multiple client. 

### How it works
Upon connecting to the guest WLAN, nodogsplash flags the client as requiring authentication and redirects it to the captive portal, which prompts for a one-time access code.

The OTP is generated via Google Authenticator and validated against the server using the google-authenticator service and an custom PAM module.

After successful OTP verification, the portal signals nodogsplash to authorize the client, and network access is granted.

### Installation
#### OpenWrt/Nodogsplas
I assume that you have already installed OpenWrt on your router.

Refresh package list on OpenWrt. 
```bash
opkg update
```
Install nodogsplash
```bash
opkg install nodogsplash
```
Configure nodogsplash config. I'll be deploying this in a public cloud so the port is 443 and it's in https, if server is in your local network then change to http and 8000 (depending on you port-forwarding config). Look for line below and edit:
*etc/config/nodogsplash*
```
list preauthenticated_users 'allow tcp port 443 to <Server_IP>
```
*/etc/nodogsplash/htdocs/splash.html*
```
<meta http-equiv="refresh" content="0;URL='https://<Server_IP>:443/index.html?authaction=$authaction&amp;tok=$tok&amp;redir=$redir&amp;mac=$clientmac&amp;ip=$clientip&amp;gatewayname=$gatewayname'" />
```
Enable and start nodogsplash service.
```bash
/etc/init.d/nodogsplash enable
/etc/init.d/nodogsplash start
```
#### Google Authenticator
Installed package if not yet installed. 
```bash
apt install libpam-google-authenticator
```
Generate your google authenticator config. Download authenticator app like [this](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en&pli=1), scan the QR generated to link it to the app. 
```bash
google-authenticator -t
```
#### Docker
Create a directory for the config and images. Google authenticor config is located in `/home/yourusername/.google_authenticator`. Mount it in docker compose.
```bash
mkdir data
tree -a data
.
├── background.jpeg
├── favicon.ico
├── .google_authenticator
└── logo.webp
```
*compose.yaml*
```yaml
services:
    otp-capture-portal:
        container_name: otp-capture-portal
        image: ghcr.io/mcbtaguiad/otp-capture-portal:main
        build:
            context: .
            dockerfile: Dockerfile
        ports:
            - "8000:8000"
        environment:
            - BUSINESS_NAME=Swamp Coffee
            - ADMIN_USERNAME=admin
            - ADMIN_PASSWORD=password123
        volumes:
            - ./data:/otpspot/data
```
Deploy
```bash
docker compose up -d
```
### Demo
Visit this [link](https://swampcoffee.marktaguiad.dev/). Add */admin* to view admin page, use **admin** and **password123** to login. If successfully logged in it will automatically redirect to OTP generator page. This is already in the public domain, you can use this as your capture portal. I'll live it to you to find my public IP and if you are fine with **Shrek** looking at you everytime you login hahahaha. 

{{< imglink src="/images/web/otp-capture-portal/otp-capture-portal-003.png" alt="imagen" >}}
