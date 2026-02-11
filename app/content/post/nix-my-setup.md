---
title: "My NixOS Setup"
date: 2026-02-10
author: "Mark Taguiad"
tags: ["nixos", "nix"]
TocOpen: false
UseHugoToc: true
weight: 2
---

> [!INFO]
> It's my brother birthday, his name is Nico or Nickx (jejemon kapatid! hahaha). 

[![imagen](/images/nix-my-setup/nix-my-setup-001.png)](/images/nix-my-setup/nix-my-setup-001.png)

This maybe be the end of my distro hopping from ubuntu - mint - debian - fedora - popos - arch - void - artix, and finally nixOS. I just the love that almost everything is declarative to change in the system, so if you break anything you can just spin the last generation that is working. BTW this is not a tutorial, this is a note for my future stupid self if I ever have to build everything from scratch.

Repo for this blog - [link](https://github.com/mcbtaguiad/dotfile-i3-nixos.git). 
# Table of Contents
{{< toc >}}

### SSH
```
  # Enable the OpenSSH daemon.
  services.openssh = {
    enable = true;
  };
```
### Package Manager / flakes
#### Search package
Add this in first in */etc/nixos/configuration.nix*.
```
nix.settings.experimental-features = [ "nix-command" "flakes" ];
```
Search the official Nixpkgs for a package, e.g., "cargo"
```
nix search nixpkgs cargo
```
Or just search from the nixOS package site.
[https://search.nixos.org/](https://search.nixos.org/)

#### Install package
You can either install package as system-wide or userspace. Some cases you can declare it in services that needed that package - see i3wm section.  
```
  # system-wide
  environment.systemPackages = with pkgs; [
    vim
    wget
    curl
    neofetch
  ];

  # userspace
  users.users.YourUserName = {
    isNormalUser = true;
    description = "Your Name";
    extraGroups = [ "networkmanager" "wheel" ];
    packages = with pkgs; [
      firefox
      vscode
      alacritty
      kubectl
      thunderbird
      docker
      ];
  };

```

### Fonts
Nothing special, same with package install. 
```
  fonts.packages = with pkgs; [
    noto-fonts
    noto-fonts-cjk-sans
    noto-fonts-color-emoji
    liberation_ttf
    ibm-plex
  ];
```

### Networking
**NetworkManager** is enabled by default, comming from artix I am still contemplating to use connman. Will update this blog if I ever gone mad and messed up my config again. 
```
  # Enable networking
  networking.networkmanager.enable = true;
```

### Sounds and Bluetooth
#### pipewire
```
  services.pulseaudio.enable = false;
  security.rtkit.enable = true;
  services.pipewire = {
    enable = true; # if not already enabled
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
    # If you want to use JACK applications, uncomment the following
    #jack.enable = true;
  };

  
```
#### bluetooth
```
  # Enable bluetooth
  services.blueman.enable = true;
  hardware.bluetooth.enable = true;
```

### Gnome
I'm switching from i3 and gnome (depending on the mood ahaha)
```
# Enable Gnome
  services.displayManager.gdm.enable = true;
  services.desktopManager.gnome.enable = true;
```

### i3wm and i3blocks
```
  services.xserver = {
    enable = true;
    #desktopManager = {xterm.enable=false;};
    windowManager.i3 = {
      enable = true;
      extraPackages = with pkgs; [
        dmenu
        #i3status
        i3lock
        i3blocks
      ];
    };
  };

  # add this to make i3blocks work
  environment.pathsToLink = [ "/libexec" ];
```

### Backlight
I'm using light to handle my backlight, look at documentation if you prefer xbacklight. 
```
  programs.light.enable = true;
```

### Power Management
I'm using laptop, need to add battery threshold and profile management - tlp can do all that. 
```
  # Disable power daemon, conflicts with tlp
  services.power-profiles-daemon.enable = false;
  # Enable thermald
  services.thermald.enable = true;
  # Enable tlp
  services.tlp = {
      enable = true;
      settings = {
        CPU_SCALING_GOVERNOR_ON_AC = "performance";
        CPU_SCALING_GOVERNOR_ON_BAT = "powersave";

        CPU_ENERGY_PERF_POLICY_ON_BAT = "power";
        CPU_ENERGY_PERF_POLICY_ON_AC = "performance";

        CPU_MIN_PERF_ON_AC = 0;
        CPU_MAX_PERF_ON_AC = 100;
        CPU_MIN_PERF_ON_BAT = 0;
        CPU_MAX_PERF_ON_BAT = 20;

       #Optional helps save long term battery health
       START_CHARGE_THRESH_BAT0 = 40; # 40 and below it starts to charge
       STOP_CHARGE_THRESH_BAT0 = 80; # 80 and above it stops charging

      };
  };
```

### Environment
Unlike in traditional linux where you just have to add it in .bashrc or .profile, in here you have to declare it in configuration. Look up documentation for your specific need. In my case I need to add **.local/bin** to **$PATH**. 
``` 
  environment.localBinInPath = true;
```

### Python 
PIP install is also declarative if you want it to persist in you system. For development stick to python-env. 
```
  environment.systemPackages = with pkgs; [
    (python3.withPackages (ps: with ps; [
      psutil
      flask
    ]))

  ];
```

### Mounts
Mounts are configured in **/etc/nixos/hardware-configuration.nix**.

If you dont know your disk type.
```
lsblk -f
NAME FSTYPE FSVER LABEL                        UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
sda                                                                                                
└─sda1
     exfat  1.0                                776D-C5F6                              38.4G    92% /srv/ssd
sdb  iso966 Jolie nixos-graphical-25.11-x86_64 1980-01-01-00-00-00-00                              
├─sdb1
│    iso966 Jolie nixos-graphical-25.11-x86_64 1980-01-01-00-00-00-00                              
└─sdb2
     vfat   FAT12 EFIBOOT                      1234-5678    
```
Get UUID
```
blkid /dev/sda1
/dev/sda1: UUID="776D-C5F6" BLOCK_SIZE="512" TYPE="exfat" PARTUUID="90c46da4-bc2b-4dd2-ad89-715e6de657b2"
```
Add in hardware configuration.
```
  fileSystems."/srv/ssd" =
    { device = "/dev/disk/by-uuid/776D-C5F6";
      fsType = "exfat";
    };
```
To update **/etc/fstab** rebuild nixOS. 
```
sudo nixos-rebuild switch
```

### Apply and rebuild NixOS
When you think everything is in order run this command to rebuild your system. This will create new generation and store the old generation in case you need to rollback.
```
sudo nixos-rebuild switch
```
### Delete old generation
Make sure to delete old generation that no longer needed to free-up some space. 
```
sudo nix-collect-garbage -d #$ this will delete old generation
sudo nix-env --profile /nix/var/nix/profiles/system --delete-generations +5 # keep 5
```
Rebuild and update boot menu
```
sudo nixos-rebuild switch
```

### chroot
In a scenario where you delete all the past generation, you can still use chroot method to fix your system. Boot to a installation media.
```
mount /dev/sda2 /mnt  
mount /dev/sda1 /mnt/boot
nixos-enter
nixos-rebuild boot
```