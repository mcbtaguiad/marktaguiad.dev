---
title: "My NixOS Setup"
date: 2026-02-10
author: "Mark Taguiad"
tags: ["nixos", "nix"]
TocOpen: false
UseHugoToc: true
weight: 2
---

{{< info >}}
It's my brother birthday, his name is Nico or Nickx (jejemon kapatid! hahaha).
{{< /info >}}


{{< imglink src="/images/linux/nix-my-setup/nix-my-setup-001.png" alt="imagen" >}}


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
#### Home Manager
Here you configure package and service that is not system wide and only available to the user. I still preffer every config configured in `configuration.nix`, I'm the only user of the system. 
##### Install
```bash
nix-channel --add https://github.com/nix-community/home-manager/archive/master.tar.gz home-manager
nix-channel --update
```
Run `home-manager` to generate init config. Config is located at `~./.config/home-manager/home.nix'

##### Sample Config
*home.nix*
```bash
{ config, pkgs, ... }:

{
  home.username = "mcbtaguiad";

  home.homeDirectory = "/home/mcbtaguiad";
  home.stateVersion = "25.11"; # Please read the comment before changing.

  home.packages = [

  ];

  home.file = {
    # '';
  };

  home.sessionVariables = {
    # EDITOR = "emacs";
  };

  programs.home-manager.enable = true;

  programs.vim = {
    enable = true;
    plugins = with pkgs.vimPlugins; [
      vim-nix
    ];
    settings = {
      ignorecase = true;
    };
    extraConfig = ''
      set mouse=a
  };
}
```
##### Build/Install
```bash
home-manager switch
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
#### NetworkManager
**NetworkManager** is enabled by default, comming from artix I am still contemplating to use connman. Will update this blog if I ever gone mad and messed up my config again. 
```
  # Enable networking
  networking.networkmanager.enable = true;
```
#### Bridge Network
If you plan to use virtualization, then I recommend you to enable bridge network. This will allow your VM to get IP from you router DHCP server. 
```bash
 # Bridge network
  networking.useDHCP = false;
  networking.bridges = {
    "br0" = {
      interfaces = [ "enp0s31f6" ];
    };
  };
  networking.interfaces.br0.ipv4.addresses = [
    {
      address = "192.168.254.69";
      prefixLength = 24;
    }
  ];
  networking.defaultGateway = "192.168.254.254";
  networking.nameservers = [
    "1.1.1.1"
    "8.8.8.8"
  ];
  networking.firewall.checkReversePath = "loose";
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
      ]; };
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
```bash
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
```bash
sudo nixos-rebuild switch
```

### Virtualization
Add in enviroment package.
```bash
  environment.systemPackages  = with pkgs; [
    virt-manager
    libguestfs
    dnsmasq
```
Add user in libvirtd group.
```bash
  users.users.mcbtaguiad = {
    isNormalUser = true;
    description = "Mark Taguiad";
    extraGroups = [
      "networkmanager"
      "wheel"
      "libvirtd"
      "qemu-libvirtd"
    ];
  };
```
Enable libvirtd service.
```bash
  virtualisation.libvirtd = {
    enable = true;
    qemu = {
      package = pkgs.qemu_kvm;
      vhostUserPackages = with pkgs; [ virtiofsd ];
      runAsRoot = true;
      swtpm.enable = true;
    };
    allowedBridges = [ "br0" ];
  };
```
Add "kvm-intel" in the bootloader, "kvm-amd" is you are using amd.
```bash
  boot.kernelParams = [
    "kvm-intel"
  ];
```

### Nvidia
Nvidia just sucks, my next purchase would be AMD. FUCK NVIDIA!. This section is well documented in NixOS [wiki](https://nixos.wiki/wiki/Nvidia), I'll just put it here as a reference when I reinstall NixOS.
```bash
  # Enable OpenGL
  hardware.graphics = {
    enable = true;
  };

  # Load nvidia driver for Xorg and Wayland
  services.xserver.videoDrivers = [ "nvidia" ];

  hardware.nvidia = {
    modesetting.enable = true;
    powerManagement.enable = true;
    powerManagement.finegrained = false;
    open = false;
    nvidiaSettings = true;
    prime = {
      offload = {
        enable = true;
        enableOffloadCmd = true;
      };
      # sync.enable = true;
      intelBusId = "PCI:0:2:0";
      nvidiaBusId = "PCI:1:0:0";
    };

    # Optionally, you may need to select the appropriate driver version for your specific GPU.
    package = config.boot.kernelPackages.nvidiaPackages.stable;
  };

```
Boot Parameter.
```bash
  # Boot Kernel Parameters
  boot.kernelParams = [
    "nvidia-drm.modeset=1"
    "mem_sleep_default=deep"
  ];
```

### Apply and rebuild NixOS
When you think everything is in order run this command to rebuild your system. This will create new generation and store the old generation in case you need to rollback.
```
sudo nixos-rebuild switch
```
To upgrade packages.
```
sudo nixos-rebuild switch --upgrade
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

### Failed Build
If you encounter error like fail rebuild even though you've revert back changes. You might need to delete cache and old failed build. 
```bash
sudo nix-collect-garbage -d
sudo nix-store --verify --check-contents --repair
```

### chroot
In a scenario where you delete all the past generation, you can still use chroot method to fix your system. Boot to a installation media.
```
mount /dev/sda2 /mnt  
mount /dev/sda1 /mnt/boot
nixos-enter
nixos-rebuild boot
```

### Nix Build Command Dying
The `nix-build` command dying with Signals.SIGSEGV: 11 indicates a segmentation fault, which is an illegal memory access error. This is typically caused by a bug in the Nix program itself, an incompatibility between libraries, a system misconfiguration, or faulty hardware. 
```bash
Command 'nix-build '<nixpkgs/nixos>' --attr config.system.build.toplevel --no-out-link' died with <Signals.SIGSEGV: 11>.
```
Possible Fix; check for system corruntion.
```bash
nix-store --verify --check-contents --repair
```
Or if you undervolt your CPU. Disabled undervolt setting and monitor.

### Automatic System Clean
This will clean your system older than 4 days.
```
  programs.nh = {
    enable = true;
    clean.enable = true;
    clean.extraArgs = "--keep-since 4d --keep 3";
    flake = "/home/user/my-nixos-config";  
  };
```

Check this [repo](https://github.com/nix-community/nh) for more info.
