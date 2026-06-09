---
title: "Using NixOS Flakes The Wrong Way"
date: 2026-05-24
author: "Mark Taguiad"
tags: ["linux", "nixos", "flakes"]
UseHugoToc: true
weight: 2
---
{{< info >}}
It's been a while since I last updated this blog and recently I've been spending more time experimenting with NixOS Flakes. If you are curious about my setup, feel free to checkout my [repo](https://github.com/mcbtaguiad/dotfile-i3-nixos/tree/main/nixos).
{{< /info >}}

{{< imglink src="/images/linux/nix-my-setup/flakes/cat-confused.png" alt="imagen" >}}

This is a poor attempt to use Flakes in NixOS-the learning curve is just steep. Will update this post once I really know what I'm doing. 
# Table of Contents
{{< toc >}}

Enable flakes first in `configuration.nix`.

```
nix.settings.experimental-features = [ "nix-command" "flakes" ];
```
Then rebuild.
```bash
nixos-rebuild switch
```
Create flake structure, I'm using `marilag` server.
```bash
[root@marilag:/etc/nixos]# tree .
.
├── flake.lock
├── hosts
│   └── marilag
│       ├── configuration.nix
│       └── hardware-configuration.nix
└── modules
    ├── hardware.nix
    ├── networking.nix
    ├── services.nix
    └── users.nix

4 directories, 8 files
```
Move `configuration.nix` and `hardware-configuration.nix` to `/etc/nixos/hosts/marilag`.
```bash
cd /etc/nixos
mv configuration.nix hosts/marilag 
mv hardware-configuration.nix hosts/marilag 
```

Create the configurations.

*flake.nix*
```
{
  description = "Marilag NixOS server";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { nixpkgs, nixpkgs-unstable, ... }: {
    nixosConfigurations.marilag = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";

      modules = [
         {
            nixpkgs.overlays = [
              (final: prev: {
                unstable = import nixpkgs-unstable {
                   inherit (final) config;
                   inherit (final.stdenv.hostPlatform) system;
                };
              })
            ];
          }
        ./hosts/marilag/configuration.nix
        ./hosts/marilag/hardware-configuration.nix

        ./modules/hardware.nix
        ./modules/networking.nix
        ./modules/users.nix
        ./modules/services.nix
      ];
    };
  };
}
```

*/etc/nixos/hosts/marilag/configuration.nix*
```
{
  system.stateVersion = "25.11";

  environment.systemPackages = with pkgs; [
    vim
    wget
    btop
    htop
    git
    zip
    unzip

    virt-manager
    libguestfs
    dnsmasq
    cloud-utils

  ];

  programs.nh = {
    enable = true;
    clean.enable = true;
    clean.extraArgs = "--keep-since 4d --keep 3";
    flake = "/etc/nixos";
  };

  environment.localBinInPath = true;
  environment.pathsToLink = [ "/libexec" ];
}
```

*/etc/nixos/modules/networking.nix*
```
{ config, pkgs, ... }:

{
  networking = {
    hostName = "marilag";

    networkmanager.enable = true;

    useDHCP = false;

    bridges.br0.interfaces = [ "enp0s31f6" ];

    interfaces.br0.ipv4.addresses = [
      {
        address = "192.168.254.100";
        prefixLength = 24;
      }
    ];

    defaultGateway = "192.168.254.254";

    nameservers = [
      "1.1.1.1"
      "8.8.8.8"
    ];

    firewall.checkReversePath = "loose";
  };
}
```

*/etc/nixos/modules/users.nix*
```
{ config, pkgs, ... }:

{
  networking = {
    hostName = "marilag";

    networkmanager.enable = true;

    useDHCP = false;

    bridges.br0.interfaces = [ "enp0s31f6" ];

    interfaces.br0.ipv4.addresses = [
      {
        address = "192.168.254.100";
        prefixLength = 24;
      }
    ];

    defaultGateway = "192.168.254.254";

    nameservers = [
      "1.1.1.1"
      "8.8.8.8"
    ];

    firewall.checkReversePath = "loose";
  };
}
```

*/etc/nixos/modules/services.nix*
```
{ config, pkgs, ... }:

{
  # SSH server
  services.openssh = {
    enable = true;

    ports = [ 22 ];

    settings = {
      PermitRootLogin = "no";
      PasswordAuthentication = true;  # later switch to false + keys
    };
  };

  # Power management
  services.power-profiles-daemon.enable = false;

  services.thermald.enable = true;

  services.tlp = {
    enable = true;

    settings = {
      START_CHARGE_THRESH_BAT0 = 65;
      STOP_CHARGE_THRESH_BAT0 = 80;

      CPU_SCALING_GOVERNOR_ON_AC = "performance";
      CPU_SCALING_GOVERNOR_ON_BAT = "powersave";
    };
  };

  # thinkfan
  services.thinkfan = {
    enable = true;

    sensors = [
      {
        type = "hwmon";
        query = "/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp1_input";
      }
    ];

    fans = [
      {
        type = "tpacpi";
        query = "/proc/acpi/ibm/fan";
      }
    ];

    levels = [
      [ 0 0 45 ]
      [ 1 43 50 ]
      [ 2 48 55 ]
      [ 3 53 60 ]
      [ 4 58 65 ]
      [ 5 63 70 ]
      [ 6 68 75 ]
      [ 7 72 80 ]
      [ 127 78 32767 ]
    ];
  };
}
```

*/etc/nixos/modules/hardware.nix*
```
{ config, pkgs, ... }:

{
  boot = {
    loader.systemd-boot.enable = true;
    loader.efi.canTouchEfiVariables = true;

    kernelParams = [
      "kvm-intel"
      "mem_sleep_default=deep"
    ];

    kernelModules = [ "thinkpad_acpi" ];

    extraModprobeConfig = ''
      options thinkpad_acpi fan_control=1
    '';

    # IMPORTANT: keep default kernel first while stabilizing
    # kernelPackages = pkgs.linuxPackages_6_12;
  };

  time.timeZone = "Asia/Manila";

  i18n.defaultLocale = "en_US.UTF-8";
  i18n.supportedLocales = [ "en_US.UTF-8/UTF-8" ];
}
```

Rebuild system.
```bash
nixos-rebuild switch --flake /etc/nixos#marilag
```
