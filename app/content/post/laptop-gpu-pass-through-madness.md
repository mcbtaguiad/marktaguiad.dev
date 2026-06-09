---
title: "Optimus Said No: A Laptop GPU Passthrough Tragedy in Proxmox"
date: 2026-05-20
author: "Mark Taguiad"
tags: ["proxmox", "gpu-passthrough", "linux", "gpu"]
UseHugoToc: true
weight: 2
---
{{< imglink src="/images/linux/gpu-madness/bart-hit-homer.webp" alt="imagen" >}}

The first I was optimistic and blame my ignorance (still is today) why it failed. The second time, I did my research but still did anyway it to satisfy my curiosity.

This is the last time, please just buy a desktop GPU and save yourself from headache. 
# Table of Contents
{{< toc >}}

### Setup
I built a Proxmox Node using an old Laptop-`Thinkpad P51`.
```bash
         .://:`              `://:.             root@marilag
       `hMMMMMMd/          /dMMMMMMh`           ------------
        `sMMMMMMMd:      :mMMMMMMMs`            OS: Proxmox VE 9.1.1 x86_64
`-/+oo+/:`.yMMMMMMMh-  -hMMMMMMMy.`:/+oo+/-`    Host: 20HJS16P08 (ThinkPad P51)
`:oooooooo/`-hMMMMMMMyyMMMMMMMh-`/oooooooo:`    Kernel: Linux 6.17.2-1-pve
  `/oooooooo:`:mMMMMMMMMMMMMm:`:oooooooo/`      Uptime: 3 hours, 43 mins
    ./ooooooo+- +NMMMMMMMMN+ -+ooooooo/.        Packages: 891 (dpkg)
      .+ooooooo+-`oNMMMMNo`-+ooooooo+.          Shell: bash 5.2.37
        -+ooooooo/.`sMMs`./ooooooo+-            Display (LGD0538): 1920x1080 @ 60 Hz in 15" [Built-in]
          :oooooooo/`..`/oooooooo:              Terminal: /dev/pts/1
          :oooooooo/`..`/oooooooo:              CPU: Intel(R) Core(TM) i7-7820HQ (8) @ 3.90 GHz
        -+ooooooo/.`sMMs`./ooooooo+-            GPU 1: NVIDIA Quadro M1200 Mobile [Discrete]
      .+ooooooo+-`oNMMMMNo`-+ooooooo+.          GPU 2: Intel HD Graphics 630 @ 1.10 GHz [Integrated]
    ./ooooooo+- +NMMMMMMMMN+ -+ooooooo/.        Memory: 18.23 GiB / 46.77 GiB (39%)
  `/oooooooo:`:mMMMMMMMMMMMMm:`:oooooooo/`      Swap: 0 B / 8.00 GiB (0%)
`:oooooooo/`-hMMMMMMMyyMMMMMMMh-`/oooooooo:`    Disk (/): 5.52 GiB / 67.73 GiB (8%) - ext4
`-/+oo+/:`.yMMMMMMMh-  -hMMMMMMMy.`:/+oo+/-`    Disk (/mnt/pve/ssd-dir): 22.56 GiB / 109.48 GiB (21%) - ext4
        `sMMMMMMMm:      :dMMMMMMMs`            Local IP (vmbr0): 192.168.69.69/24
       `hMMMMMMd/          /dMMMMMMh`           Battery (00NY493): 66% [AC Connected]
         `://:`              `://:`             Locale: en_US.UTF-8

```
The plan is to passthrough `NVIDIA Quadro M1200` GPU to an Arch Linux VM and run LLM and Jellyfin.

### Config
These are the config. I may have used different setup while testing configuration I find in forums. This is the final version where i conclude that it is madness to continue.

*/etc/pve/qemu-server/204.conf*
```
#arch nvidia
agent: 1
balloon: 0
bios: ovmf
boot: c
bootdisk: scsi0
cicustom:  
ciupgrade: 1
cores: 4
cpu: host
efidisk0: nvme-lvm:vm-204-disk-1,efitype=4m,size=4M
hostpci0: 0000:01:00,pcie=1
hotplug: network,disk,usb
ide1: nvme-lvm:vm-204-cloudinit,media=cdrom,size=4M
ipconfig0: ip=192.168.69.69/24,gw=192.168.69.1
kvm: 1
machine: q35
memory: 16384
meta: creation-qemu=10.1.2,ctime=1777956272
name: mrlgarch3dnvidia
nameserver: 1.1.1.1 8.8.8.8
net0: virtio=BC:24:11:74:61:CC,bridge=vmbr0,firewall=1
```

*/etc/default/grub*
```
GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on"
```

*/etc/modprobe.d/blacklist.conf*
```
blacklist nouveau
blacklist nvidia
```

*/etc/modules*
```
vifio
vifio_iommu_type1
vifio_pci
vifio_virqfd
```
### The Bullshit
Seem's okay at first, was able to install driver and the VM can detect the GPU.
```bash
01:00.0 3D controller: NVIDIA Corporation GM107GLM [Quadro M1200 Mobile] (rev a2)
	Physical Slot: 0
	Flags: bus master, fast devsel, latency 0, IRQ 16
	Memory at 80000000 (32-bit, non-prefetchable) [size=16M]
	Memory at 7000000000 (64-bit, prefetchable) [size=256M]
	Memory at 7010000000 (64-bit, prefetchable) [size=32M]
	I/O ports at 7000 [size=128]
	Expansion ROM at 81080000 [disabled] [size=512K]
	Capabilities: [60] Power Management version 3
	Capabilities: [68] MSI: Enable- Count=1/1 Maskable- 64bit+
	Capabilities: [78] Express Endpoint, IntMsgNum 0
	Capabilities: [100] Virtual Channel
	Capabilities: [250] Latency Tolerance Reporting
	Capabilities: [128] Power Budgeting <?>
	Capabilities: [600] Vendor Specific Information: ID=0001 Rev=1 Len=024 <?>
	Kernel driver in use: nvidia
	Kernel modules: nouveau, nvidia_drm, nvidia

01:00.1 Audio device: NVIDIA Corporation GM107 High Definition Audio Controller [GeForce 940MX] (rev a1) (prog-if 00 [HDA compatible])
	Physical Slot: 0
	Flags: bus master, fast devsel, latency 0, IRQ 17
	Memory at 81000000 (32-bit, non-prefetchable) [size=16K]
	Capabilities: [60] Power Management version 3
	Capabilities: [68] MSI: Enable- Count=1/1 Maskable- 64bit+
	Capabilities: [78] Express Endpoint, IntMsgNum 0
	Kernel driver in use: snd_hda_intel
	Kernel modules: snd_hda_intel
```

The bullshit that persist. 
- NVML sees zero GPUs.
- The driver cannot successfully load or execute the GPU firmware (VBIOS), so RM initialization aborts.
```bash
[root@mrlgarch3dnvidia ~]# nvidia-smi
No devices were found
```
```bash
[root@mrlgarch3dnvidia ~]# dmesg | grep -i nvrm | tail -50
[    6.290618] NVRM: loading NVIDIA UNIX x86_64 Kernel Module  580.159.03  Fri Apr 24 06:16:47 UTC 2026
[   29.908481] NVRM: GPU 0000:01:00.0: Failed to copy vbios to system memory.
[   29.908635] NVRM: GPU 0000:01:00.0: RmInitAdapter failed! (0x30:0xffff:1129)
[   29.908640] NVRM: GPU 0000:01:00.0: rm_init_adapter failed, device minor number 0
[ 2857.191740] NVRM: GPU 0000:01:00.0: Failed to copy vbios to system memory.
[ 2857.191897] NVRM: GPU 0000:01:00.0: RmInitAdapter failed! (0x30:0xffff:1129)
[ 2857.191905] NVRM: GPU 0000:01:00.0: rm_init_adapter failed, device minor number 0
```
### Conclusion
Just buy a desktop GPU, don't buy NVIDIA if you are using Linux as your main setup. Even in desktop environment NVIDIA Optimus is just a pain in the butt to setup. 

Check this [blog](https://dipankar-das.com/blog/proxmox-laptop-gpu-passthrough-failure/) for more detailed explanation. 
