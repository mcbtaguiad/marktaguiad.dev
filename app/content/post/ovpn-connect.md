---
title: "OVPN Connect Script"
date: 2026-02-15
author: "Mark Taguiad"
tags: ["ovpn", "bash", "otp"]
UseHugoToc: true
weight: 2
---
Simple script to automate connection to OVPN with OTP authentication. 
# Table of Contents
{{< toc >}}

### Server 
For server setup you can use this [repo](https://github.com/zaheerahmad33/OpenVPN-2FA-GoogleAuth) as reference. 

### Script
```bash
#!/usr/bin/env bash

# -----------------------------------------------
# VPN Management Script
# -----------------------------------------------

PARAM_START='start'
PARAM_STOP='stop'
PARAM_STATUS='status'
PARAM_HELP='help'

USERNAME='yourUsername'

HELP_MSG="PARAMETERS: start, stop, status, help. Example: 'vpn start'"
ERROR_MSG="Run 'vpn help' for a list of allowed parameters."

# Map VPN shortcuts to configuration files and TOTP keys
declare -A VPN_CONFIGS=(
    ["server1"]="~/.ovpn/server1.ovpn"
    ["server2"]="~/.ovpn/server2.ovpn"
    ["server3"]="~/.ovpn/server3.ovpn"

)

declare -A VPN_TOTP=(
    ["server1"]="TOTP1-SECRET"
    ["server2"]="TOTP2-SECRET"
    ["server3"]="TOTP3-SECRET"
)

# Select VPN config based on second argument
if [[ -n "${VPN_CONFIGS[$2]}" ]]; then
    OVPN_FILE_PATH="${VPN_CONFIGS[$2]}"
    TOTP_NOW="$(oathtool -b --totp "${VPN_TOTP[$2]}")"
else
    echo 'null' >/tmp/ovpn.out 2>&1 &
fi

# -----------------------------------------------
# VPN Functions
# -----------------------------------------------

start_vpn() {
    # Uncomment this if you configure OVPN to have prefix in auth
    # OVPN_PREFIX="your_custom_ovpn_prefix"
    # TOTP_NOW="${OVPN_PREFIX}?${TOTP_NOW}"

    echo "TOTP: $TOTP_NOW"
    echo "Connecting to VPN..."
    
    nohup openvpn --config "$OVPN_FILE_PATH" \
        --auth-user-pass <(echo -e "$USERNAME\n$TOTP_NOW") \
        --script-security 2 \
        --setenv PATH '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' \
        --up /usr/bin/update-systemd-resolved \
        --up-restart \
        --down /usr/bin/update-systemd-resolved \
        --down-pre \
        >/tmp/ovpn.out 2>&1 &

    echo "Connected!"
}

stop_vpn() {
    echo "Stopping VPN Connection..."
    sudo killall openvpn
    echo "Removing VPN tunnel if exists..."
    sudo ip link delete tun0
    echo "Disconnected!"
}

status_vpn() {
    ps -a | grep openvpn
    echo "VPN running in this process."
}

# -----------------------------------------------
# Main Logic
# -----------------------------------------------
case "$1" in
    "$PARAM_START") start_vpn ;;
    "$PARAM_STOP") stop_vpn ;;
    "$PARAM_STATUS") status_vpn ;;
    "$PARAM_HELP") echo "$HELP_MSG" ;;
    *) echo "$ERROR_MSG" ;;
esac

```