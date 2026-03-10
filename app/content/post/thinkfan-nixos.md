---
title: "Thinkfan NixOS"
date: 2026-03-10
author: "Mark Taguiad"
tags: ["thinkfan", "nixos"]
UseHugoToc: true
weight: 2
---
{{< info >}}
Just gonna put here for future reference.
{{< /info >}}

I have a Thinkpad P51 and T470 but noticed that it is always running hot even on a cold day or when it is at idle. The good things is there is a solution already by [vmature/thinkfan](https://github.com/vmature/thinkfan). This is a lightweight fan control program that can be used to control the fan speed of your Thinkpad.

# Table of Contents
{{< toc >}}

### Installation
Add thinkfan to packages.
```bash
 environment.systemPackages = with pkgs; [
   thinkfan
 ];
```

### Configuration
Verify the fan acpi module.
```bash
~ cat /proc/acpi/ibm/fan 
status:		enabled
speed:		4291
level:		5
commands:	level <level> (<level> is 0-7, auto, disengaged, full-speed)
commands:	enable, disable
commands:	watchdog <timeout> (<timeout> is 0 (off), 1-120 (seconds))
```
Find sensors, for my setup I only monitor the CPU temperature. It is usually the `coretemp` sensor.
```bash
➜  ~ find /sys -name "temp*_input"
find: ‘/sys/kernel/tracing’: Permission denied
find: ‘/sys/kernel/debug’: Permission denied
/sys/devices/platform/thinkpad_hwmon/hwmon/hwmon6/temp6_input
/sys/devices/platform/thinkpad_hwmon/hwmon/hwmon6/temp3_input
/sys/devices/platform/thinkpad_hwmon/hwmon/hwmon6/temp7_input
/sys/devices/platform/thinkpad_hwmon/hwmon/hwmon6/temp4_input
/sys/devices/platform/thinkpad_hwmon/hwmon/hwmon6/temp8_input
/sys/devices/platform/thinkpad_hwmon/hwmon/hwmon6/temp1_input
/sys/devices/platform/thinkpad_hwmon/hwmon/hwmon6/temp5_input
/sys/devices/platform/thinkpad_hwmon/hwmon/hwmon6/temp2_input
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp3_input
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp4_input
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp1_input
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp5_input
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp2_input
/sys/devices/pci0000:00/0000:00:1b.0/0000:02:00.0/nvme/nvme1/hwmon1/temp1_input
/sys/devices/pci0000:00/0000:00:1d.0/0000:3e:00.0/nvme/nvme0/hwmon0/temp1_input
/sys/devices/pci0000:00/0000:00:1d.0/0000:3e:00.0/nvme/nvme0/hwmon0/temp2_input
/sys/devices/virtual/thermal/thermal_zone0/hwmon2/temp1_input
/sys/devices/virtual/thermal/thermal_zone3/hwmon8/temp1_input
/sys/devices/virtual/thermal/thermal_zone1/hwmon3/temp1_input
```
Identify the CPU sensor property, confirm the labels. 
```bash
~ for i in /sys/devices/platform/coretemp.0/hwmon/hwmon7/temp*_label; do
  echo "$i: $(cat $i)"
done
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp1_label: Package id 0
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp2_label: Core 0
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp3_label: Core 1
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp4_label: Core 2
/sys/devices/platform/coretemp.0/hwmon/hwmon7/temp5_label: Core 3
```
The important one for `thinkfan` is usually:
```bash
Package id 0
```

### Service
Add service, test temperature increment and setting. I've use the default configuration, but you can change it to your liking. 
```bash
{
  services.thinkfan = {
    enable = true;

    sensors = [
      {
        name = "cpu";
        type = "hwmon";
        query = "/sys/class/hwmon/hwmon*/temp1_input";
        hwmonName = "coretemp";
      }
    ];

    fans = [
      {
        type = "tpacpi";
        query = "/proc/acpi/ibm/fan";
      }
    ];

    levels = [
      [0 0 45]
      [1 43 50]
      [2 48 55]
      [3 53 60]
      [4 58 65]
      [5 63 70]
      [7 68 80]
      [127 75 32767]
    ];
  };
}
```
If you want to add more sensor to monitor use this template.
```bash
{
  services.thinkfan = {
    enable = true;

    sensors = [
      {
        name = "cpu";
        type = "hwmon";
        query = "/sys/class/hwmon/hwmon*/temp1_input";
      }

      {
        name = "nvme0";
        type = "hwmon";
        query = "/sys/devices/pci0000:00/0000:00:1b.0/0000:02:00.0/nvme/nvme0/hwmon1/temp1_input";
      }
    ];

    fans = [
      {
        type = "tpacpi";
        query = "/proc/acpi/ibm/fan";
      }
    ];

    levels = [
      [0 0 45]
      [1 43 50]
      [2 48 55]
      [3 53 60]
      [4 58 65]
      [5 63 70]
      [7 68 80]
      [127 75 32767]
    ];
  };
}
```
### Boot Parameter
```bash
  boot.kernelModules = [ "thinkpad_acpi" ];

  boot.extraModprobeConfig = ''
    options thinkpad_acpi fan_control=1
  '';
```
### Rebuild NixOS
Restart your laptop after rebuild. 
```bash
nixos-rebuild swithch
```
### Monitoring and Testing
Verify if the service is running and if the fan setting is changing based on the temperature. 
```bash
~ journalctl -u thinkfan -b
Mar 08 16:36:55 tags-p51 systemd[1]: Starting thinkfan 2.0.0...
Mar 08 16:36:55 tags-p51 systemd[1]: Started thinkfan 2.0.0.
Mar 08 16:36:55 tags-p51 thinkfan[1508]: Temperatures(bias): 76(0) -> Fans: level 7
Mar 08 16:37:00 tags-p51 thinkfan[1508]: Temperatures(bias): 82(0) -> Fans: level 127
Mar 08 16:37:02 tags-p51 thinkfan[1508]: Temperatures(bias): 56(0) -> Fans: level 3
Mar 08 16:37:07 tags-p51 thinkfan[1508]: Temperatures(bias): 72(0) -> Fans: level 6
Mar 08 16:37:09 tags-p51 thinkfan[1508]: Temperatures(bias): 64(0) -> Fans: level 5
Mar 08 16:37:14 tags-p51 thinkfan[1508]: Temperatures(bias): 56(0) -> Fans: level 3
Mar 08 16:37:34 tags-p51 thinkfan[1508]: Temperatures(bias): 67(0) -> Fans: level 5
Mar 08 16:37:36 tags-p51 thinkfan[1508]: Temperatures(bias): 56(0) -> Fans: level 3
Mar 08 16:39:06 tags-p51 thinkfan[1508]: Temperatures(bias): 72(0) -> Fans: level 6
```
