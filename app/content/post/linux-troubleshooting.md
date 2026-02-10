---
title: "Linux Troubleshooting"
date: 2025-08-13
author: "Mark Taguiad"
tags: ["linux", "troubleshoot"]
# toc: true
weight: 2
TocOpen: false
UseHugoToc: true

---

# Table of Contents
{{< toc >}}

### CPU and Processes

#### Understanding top command
```
$ top

top - 18:47:04 up 22:45,  2 users,  load average: 0.46, 0.74, 0.85
Tasks: 410 total,   1 running, 407 sleeping,   0 stopped,   2 zombie
%Cpu(s):  7.1 us,  2.4 sy,  4.1 ni, 86.2 id,  0.1 wa,  0.0 hi,  0.0 si,  0.0 st 
MiB Mem :  47961.0 total,  32654.2 free,  11221.4 used,   7702.5 buff/cache     
MiB Swap:  20479.5 total,  20479.4 free,      0.1 used.  36739.6 avail Mem 

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND                         
  22671 mcbtagu+  14  -6   12.2g 968172 437988 S  47.2   2.0 171:20.29 firefox-bin
```
##### Header line (system status)
```
top - 18:47:04 up 22:45,  2 users,  load average: 0.46, 0.74, 0.85
```
- **18:47:04** - current time
- **up 22:45** - machine has been running for 22 hours 45 minutes
- **2 users** - two logged-in users
- **load average: 0.46, 0.74, 0.85**
    - Average number of runnable processes over:
        - last 1 min
        - last 5 min
        - last 15 min
    - On a multi-core system, these numbers are low - system is not stressed
##### Tasks (process summary)
```
Tasks: 410 total,   1 running, 407 sleeping,   0 stopped,   2 zombie
```
- **410** total - total processes/threads
- **1** running - only one actively using CPU right now
- **407** sleeping - normal; most processes wait for work
- **2** zombie - processes that exited but haven’t been cleaned up
##### CPU usage
```
%Cpu(s):  7.1 us,  2.4 sy,  4.1 ni, 86.2 id,  0.1 wa,  0.0 hi,  0.0 si,  0.0 st
```
- **us (7.1%)** - user programs
- **sy (2.4%)** - kernel/system work
- **ni (4.1%)** - low-priority (nice) processes
- **id (86.2%)** - idle CPU
- **wa (0.1%)** - waiting on disk I/O
- **hi / si** - hardware/software interrupts
- **st** - stolen by hypervisor (VMs)
##### Memory usage
```
MiB Mem :  47961.0 total,  32654.2 free,  11221.4 used,   7702.5 buff/cache
```
- **Total**: ~48 GB
- **Free**: ~32 GB (very high)
- **Used**: ~11 GB (actual app usage)
- b**uff/cache**: ~7.7 GB (filesystem cache, reclaimable)

```
MiB Swap:  20479.5 total,  20479.4 free,      0.1 used.  36739.6 avail Mem
```
- Swap almost unused - excellent
- avail Mem ~36 GB - memory pressure is basically zero
##### Process list
```
PID     USER     PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+  COMMAND
22671   mcbtag+  14  -6   12.2g  968172 437988 S  47.2   2.0 171:20.29
```
**Identity**
- PID 22671 - process ID
- USER mcbtag+ - user
- COMMAND - (cut off, but this is the process name)
**Priority**
- PR 14 - scheduler priority
- NI -6 - higher priority than normal
- Negative nice = process is favored by scheduler
**Memory**
- VIRT 12.2g - virtual memory (address space)
- RES 968 MB - actual physical RAM used
- SHR 438 MB - shared memory (counts once globally)
**State**
- S - sleeping (can still show CPU usage due to sampling)
**Usage**
- %CPU 47.2
    - About half of one CPU core
    - Totally fine on a multi-core system
- %MEM 2.0
- TIME+ 171:20
    - Total CPU time used since start
##### Some top command - while running
| Command |   Description   |
| ----- | -------- |
|  `P`  | sort by CPU |       
|  `M`  | sort by memory |
|  `1`  | show per-CPU usage |
|  `k`  | kill a process |       
|  `H`  | show threads |
|  `q`  | quit | 

#### Process States
```
ps -eo pid,stat,comm | head
PID STAT COMMAND
1 Ss   systemd
2 S    kthreadd
3 S    pool_workqueue_release
4 I<   kworker/R-rcu_gp
5 I<   kworker/R-sync_wq
6 I<   kworker/R-kvfree_rcu_reclaim
7 I<   kworker/R-slub_flushwq
8 I<   kworker/R-netns
10 I<   kworker/0:0H-events_highpri
```
**Primary States**
| Symbol | Type    | Meaning / Description    | Notes / Examples                                                                              |
| ------ | ------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| **R**  | Primary | Running                  | Actively using CPU or ready to run. Check `%CPU` to see load.                                 |
| **S**  | Primary | Sleeping (interruptible) | Waiting for an event or input. Normal for most processes.                                     |
| **D**  | Primary | Uninterruptible sleep    | Waiting on I/O (disk, network). Cannot be killed with SIGKILL. High numbers = I/O bottleneck. |
| **Z**  | Primary | Zombie                   | Process finished but parent hasn’t reaped it. No CPU usage, but occupies PID.                 |
| **T**  | Primary | Stopped                  | Paused by signal or debugger (e.g., `SIGSTOP`).                                               |
| **X**  | Primary | Dead                     | Shouldn’t appear normally. Process is terminated.                                             |


**Common Modifiers**
| Symbol | Type     | Meaning / Description      | Notes                                                |
| ------ | -------- | -------------------------- | ---------------------------------------------------- |
| **s**  | Modifier | Session leader             | Process started a session (usually shells, daemons). |
| **l**  | Modifier | Multi-threaded             | Process has multiple threads (POSIX threads).        |
| **+**  | Modifier | Foreground process group   | Attached to terminal and can receive input signals.  |
| **<**  | Modifier | High priority              | Real-time or kernel-specified priority.              |
| **N**  | Modifier | Low priority / nice        | Positive nice value (lower scheduler priority).      |
| **L**  | Modifier | Has pages locked in memory | Used in real-time processes.                         |

#### Top CPU User
##### Status
```
ps aux --sort=-%cpu | head

ps aux --sort=-%cpu | head
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
mcbtagu+   22671 17.4  2.0 12941056 1023280 ?    S<l  Feb04 239:29 /usr/lib/firefox/firefox
mcbtagu+    3742  8.6  0.5 1755524 286288 tty1   S<l+ Feb04 132:35 cosmic-comp
```
If one process is always on top - investigate it. 

Also on a multi-core system, always check if one CPU is at high utilization or 100%. App may be single-threaded. To check you can use other top command, or using `top` press 1. This will display per CPU load. 
```
top - 21:45:59 up 11 days, 10:13,  2 users,  load average: 0.34, 0.35, 0.32
Tasks: 173 total,   2 running, 171 sleeping,   0 stopped,   0 zombie
%Cpu0  :  7.1 us,  5.1 sy,  0.0 ni, 86.9 id,  0.0 wa,  0.0 hi,  1.0 si,  0.0 st
%Cpu1  : 12.9 us,  5.1 sy,  0.0 ni, 81.4 id,  0.0 wa,  0.0 hi,  0.7 si,  0.0 st
MiB Mem :   3792.2 total,    148.5 free,   1690.5 used,   2513.0 buff/cache
MiB Swap:   3792.0 total,   3058.0 free,    734.0 used.   2101.7 avail Mem
```
##### Multi-threaded
To check if an application is multi-threaded. 
```
ps -eLf

root     4047471 4047447 4047471  0   10 Feb04 ?        00:00:06 /beszel serve --http=0.0.0.0:8090
root     4047471 4047447 4047523  0   10 Feb04 ?        00:00:07 /beszel serve --http=0.0.0.0:8090
root     4047471 4047447 4047524  0   10 Feb04 ?        00:00:00 /beszel serve --http=0.0.0.0:8090
root     4047471 4047447 4047525  0   10 Feb04 ?        00:00:00 /beszel serve --http=0.0.0.0:8090
root     4047471 4047447 4047627  0   10 Feb04 ?        00:00:07 /beszel serve --http=0.0.0.0:8090 
```
#### PIDSTAT
Another tool to check cpu and process, it is a monitoring tool for individual task. 

```
pidstat

Average:        USER       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
Average:        root        17    0.00    0.17    0.00    0.17    0.17     -  rcu_preempt
Average:        root      1049    2.00    0.67    0.00    0.00    2.66     -  dockerd
```
- **USER** – The owner of the process.
- **PID** – The process ID.
- **%usr** – The percentage of CPU time spent in user mode.
- **%system** – The percentage of CPU time spent in kernel mode.
- **%guest** – The percentage of CPU time spent running virtual CPUs (guest OS).
- **%wait** – The percentage of CPU time spent waiting for I/O (like disk or network).
- **%CPU** – The total CPU usage of the process. Calculated roughly as %usr + %system + %guest + %wait.

To show the **I/O** statiscics.
```
pidstat -d

10:30:14 PM   UID       PID   kB_rd/s   kB_wr/s kB_ccwr/s iodelay  Command
10:30:14 PM     0         1     29.68     52.61      0.88       0  systemd
10:30:14 PM     0       258      0.00      2.78      0.00       0  jbd2/dm-0-8
```
- **Time (10:30:14 PM)** – Timestamp of the measurement.
- **UID (0)** – User ID of the process owner.
- **PID (1)** – Process ID.
- **kB_rd/s (29.68)** – Kilobytes read per second from disk by the process.
- **kB_wr/s (52.61)** – Kilobytes written per second to disk by the process.
- **kB_ccwr/s (0.88)** – Kilobytes written to memory that required cache cleanup (i.e., writeback from page cache).
- **iodelay (0)** – Time spent waiting for I/O in milliseconds (ms) for this interval.
- **Command (systemd)** – The process name.

Other useful command.
```
# show specific application
pidstat -C <application_name>
pidstat -p <PID>
```

#### CPU & I/O
Other common killing the performance is I/O (input), this could stretch from disk to network. A common tool to check is using `vmstat.
##### vmstat
```
vmstat

procs -----------memory---------- ---swap-- -----io---- -system-- -------cpu-------
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st gu
 7  0     52 28477860 916668 7946588    0    0   113   886 3986   15  7  2 88  2  0  0
```
- **r (run queue)** - Number of runnable process, problem exist if *r* consistently > number of CPU cores.
- **b (blocked)** - Processes waiting on I/O. High **b** = disk or network I/O **bottleneck**. 
- **swpd** - Amount of swap currently used (KB).
- **free** - Completely unused RAM.
- **buff** - Buffer cache (metadata, block I/O buffers).
- **cache** - Page cache (file contents cached in RAM). Cache shrinking + swap growing → memory trouble.
- **si (swap in)** - KB/s swapped from disk into RAM.
- **so (swap out)** - KB/s swapped from RAM to disk. Any sustained non-zero values → severe memory pressure. 
- **bi / bo (blocks in/out)** - Disk read/write activity. High values ≠ bad by default. High with high **wa** = I/O problem.
- **in** (interrupts/sec) - Hardware + software interrupts. Network traffic increases this a lot.
- **cs (context switches/sec)** - How often CPU switches between processes/threads. Extremely high values → too many threads, locks, or I/O wakeups.
- **us** - user CPU (apps)
- **sy** - kernel CPU (syscalls, I/O handling). Network-heavy systems often show high. 
- **id** - idle CPU
- **wa** - CPU waiting on I/O
- **st (steal)** - Time stolen by hypervisor (VMs only)

| Symptom              | Likely Cause        |
| -------------------- | ------------------- |
| High `r`, high `us`  | CPU-bound           |
| High `b`, high `wa`  | Disk I/O bottleneck |
| High `sy`, high `in` | Network I/O         |
| Non-zero `si/so`     | Memory pressure     |
| High `st`            | VM host contention  |

#### Disk level I/O
##### iostat
```
iostat -xz
Linux 6.17.9-76061709-generic (tags-p51) 	02/06/2026 	_x86_64_	(8 CPU)

avg-cpu:  %user   %nice %system %iowait  %steal   %idle
           6.95    0.70    1.89    2.19    0.00   88.27

Device            r/s     rkB/s   rrqm/s  %rrqm r_await rareq-sz     w/s     wkB/s   wrqm/s  %wrqm w_await wareq-sz     d/s     dkB/s   drqm/s  %drqm d_await dareq-sz     f/s f_await  aqu-sz  %util
dm-0             0.00      0.03     0.00   0.00    0.21    21.98    0.00      0.00     0.00   0.00    0.00     0.44    0.00      0.00     0.00   0.00    0.00     0.00    0.00    0.00    0.00   0.00
nvme0n1          0.98     30.17     0.24  19.51    0.20    30.77    6.52    306.79     5.36  45.12    4.69    47.07    0.00      0.00     0.00   0.00    0.00     0.00    0.38    0.71    0.03   0.40
nvme1n1          0.03      2.38     0.01  16.48    0.30    71.60    0.19      4.13     0.02  10.80    3.53    22.11    0.00      0.00     0.00   0.00    0.00     0.00    0.03    0.75    0.00   0.03
sda              0.55     74.06     0.40  42.18   18.06   134.38    0.58    540.84     0.93  61.83 1037.08   937.41    0.00      0.00     0.00   0.00    0.00     0.00    0.01  701.83    0.61   3.93
zram0            0.00      0.01     0.00   0.00    0.02    20.34    0.00      0.00     0.00   0.00    0.00     4.00    0.00      0.00     0.00   0.00    0.00     0.00    0.00    0.00    0.00   0.00
```

Critical iostat columns.
```
Device  r/s  w/s  rkB/s  wkB/s  await  svctm  %util
```
- %iowait - CPU time is spent waiting on disks.
- %util - Total disk utilization.
- r_await / w_await - Time an I/O spends waiting + being serviced. 
- aqu-sz - Queue depth, shows how many I/Os are waiting.
- wareq-sz - Shows if writes or big or small. 
- r/s / w/s - IOPS (operations per second). 

#### Identify Processes Stuck in I/O
In top look for state in *D*, or run this command.
```
ps aux | awk '$8 ~ /D/ {print}'
```

#### Priority and Nice Values
When a process is starving others, or background jobs steal CPU - its a good practiace to lower the priority of the application. 
##### Status
To check priority.
```
ps -o pid,ni,comm -p PID
```
##### Lower priority.
```
renice 10 -p PID
```
##### Raise priority
```
renice -5 -p PID
```
#### Zombie Processes
Zombie process is a child process that has completed its excution and terminated but still has entry in the system's process table. 

Find zombies and parent process
```
ps aux | grep Z
ps -o ppid= -p ZOMBIE_PID
```
You fix the parent process and not the zombie process.

#### Killing a running application

##### Kill by application name
```
pkill firefox
kill firefox
killall firefox
```
##### Terminate the process using its PID
```
pgrep firefox
22671
# or
grep firefox
mcbtagu+   22671 13.6  1.9 12791920 936552 ?     R<l  Feb04 161:06 /usr/lib/firefox/firefox

pkill 22671
kill 22671
killall 22671
```
##### Forceful Termination
```
pkill -9 22671
kill -9 22671
killall -9 22671

kill -9 firefox
killall -9 firefox
```


##### Kill all application run by user
```
ps -o pid,pgid,sess,cmd -U your_username
kill -SIGTERM -- -<PGID>
```

##### Kill process tree. 
```
# get pgid
ps -ejf | grep <application_name>
# or
pgrep -g [pgid_number]

# kill tree
kill -SIGTERM -- -<PGID>
```

### Memory
#### Usage
Checking memory usage with `free`, `vmstat`, and `/proc/meminfo`.
```
free
               total        used        free      shared  buff/cache   available
Mem:        49112048    16058028    25626304      285292    11305296    33054020

vmstat
procs -----------memory---------- ---swap-- -----io---- -system-- -------cpu-------
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st gu
 3  0     52 25628464 1058104 10247340    0    0    79   690 3693   16  8  2 88  2  0  0

cat /proc/meminfo
MemTotal:       49112048 kB
MemFree:        25607800 kB
MemAvailable:   33035832 kB
Buffers:         1058168 kB
Cached:          9118284 kB
SwapCached:            0 kB
Active:         10680872 kB
Inactive:        9254080 kB
Active(anon):    9869064 kB
Inactive(anon):   179956 kB
Active(file):     811808 kB
Inactive(file):  9074124 kB
Unevictable:        6856 kB
Mlocked:            6856 kB
SwapTotal:      20970996 kB
SwapFree:       20970944 kB
Zswap:                 0 kB
Zswapped:              0 kB
Dirty:              3916 kB
Writeback:             0 kB
AnonPages:       9765028 kB
Mapped:          1826376 kB
Shmem:            286036 kB
KReclaimable:    1129924 kB
Slab:            1769516 kB
SReclaimable:    1129924 kB
SUnreclaim:       639592 kB
KernelStack:       40272 kB
PageTables:       124312 kB
SecPageTables:      7180 kB
NFS_Unstable:          0 kB
Bounce:                0 kB
WritebackTmp:          0 kB
CommitLimit:    45527020 kB
Committed_AS:   28825424 kB
VmallocTotal:   34359738367 kB
VmallocUsed:      355244 kB
VmallocChunk:          0 kB
Percpu:             9440 kB
HardwareCorrupted:     0 kB
AnonHugePages:    237568 kB
ShmemHugePages:        0 kB
ShmemPmdMapped:        0 kB
FileHugePages:    202752 kB
FilePmdMapped:         0 kB
CmaTotal:              0 kB
CmaFree:               0 kB
Unaccepted:            0 kB
Balloon:               0 kB
HugePages_Total:       0
HugePages_Free:        0
HugePages_Rsvd:        0
HugePages_Surp:        0
Hugepagesize:       2048 kB
Hugetlb:               0 kB
DirectMap4k:     2512584 kB
DirectMap2M:    38162432 kB
DirectMap1G:     9437184 kB
```
#### Hogs
Finding memory hogs. First you can you use `top` or `htop`, with `top` press *M* to sort by memory. 

##### smem
`smem` provide the real memory usage compare to `top`. 
```
smem

  PID User     Command                         Swap      USS      PSS      RSS 
37901 user     /usr/lib/speech-dispatcher-        0      220      241     2832 
 4142 user     dbus-broker --log 4 --contr        0      228      315     2844 
```
```
# Sort by unique memory usage
smem -s uss

# Show totals
smem -t

# Show system-wide summary
smem -r

# Human readable
smem -k
```
- **swap** - Memory pages swapped to disk.
- **USS (Unique Set Size)** - Memory used only by this process.
- **PSS (Proportional Set Size)** - Shared memory is evenly divided among processes. Most accurate way to calculate total memory usage. 
- **RSS (Resident Set Size)** - Total physical memory used by the process, includes shared memory. This is what top and ps mostly show. 

If the system is slow or **OOMing**, monitor **RSS**. Some useful command to monitor PID memory.
```
ps -eo pid,comm,rss,vsz --sort=-rss | head
# watch
watch -n 1 'ps -o pid,comm,rss,vsz -p <PID>'
```

#### Leak
If an application is hogging the system, then you might need to run specific tool (base on the programming laguage use). Example would be `valgrind`to monitor/check C/C++ application. Let's focus on application currently runnin in the system. 

First indication is memory hogs, as mentioned above you can check with `top`. You can also check using `journalctl`, look for "out of memory". Another option is using `dmesg` and grep for **oom**, if OOM killer is fired then an application is killed due to memory pressure. 

Look for the process name, oom_score and cgroup(container). 
```
dmesg -T | grep -i oom
journalctl -k | grep -i "out of memory"
```

#### OOM Score
This is the primary metric to determine which process has the highes priority to be killed when the system is under RAM pressure.  Range from negative to 1000 as highest, negative is most likely not to be killed. It is also a good indication that the application has merory leak if it gets OOM Kill frequently. Fix the leak and adjust the OOM Score. 
 
View OOM Score.
```
cat /proc/[PID]/oom_score
```
To make sure your application is not killed (production environment), you can adjust the OOM score. To temporary adjust the score:
```
echo 'New_Score' | sudo tee /proc/[PID]/oom_score_adj
```
To make it persistent, create a **service** for your application and add **OOMScoreAdjust**. 

#### Swap
Swap acts as extention or extra memory when physical RAM is exhausted. It can be from a dedicated partition or file. It is recommended to use SSD for Swap as it is faster compared to HDD. 

Like mentioned in CPU section, `vmstat` can be used to check pressure on swap. 
- **si (swap in)** - KB/s swapped from disk into RAM.
- **so (swap out)** - KB/s swapped from RAM to disk. Any sustained non-zero values → severe memory pressure. 

Find PID hogging the swap. 
```
grep VmSwap /proc/*/status | sort -k2 -n | tail

/proc/722/status:VmSwap:	   14160 kB
/proc/3294346/status:VmSwap:	   14592 kB
/proc/2438154/status:VmSwap:	   17664 kB
/proc/2438006/status:VmSwap:	   18480 kB
/proc/2390869/status:VmSwap:	   18560 kB
/proc/2438011/status:VmSwap:	   18576 kB
/proc/2437850/status:VmSwap:	   18596 kB
/proc/3187376/status:VmSwap:	   53776 kB
/proc/3294357/status:VmSwap:	   57092 kB
/proc/2438293/status:VmSwap:	  194800 kB
```
### Disk

#### Status
Check what’s full.
```
df -h
```
Find space hogs.
```
du -h --max-depth=1 / | sort -hr
du -h --max-depth=1 /var | sort -hr
```
Find the offender big file.
```
du -sh * | sort -rh | head -n 10
```
#### Disk I/O slowness / system freezing
Check real-time disk usage.
```
iotop
```
Using `iostat`. Please check [iostat](#iostat). Loof for:
- High %util
- Long await times

To find the offending PID, monitor *iodelay*. 
```
pidstat -d
```

#### Disk health
##### smartctl
SMART status.
```
smartctl -x -a /dev/sdX
```
Here are the factors to looked at when performing smartctl scan. Always look for error in the smartctl report. 

- Device Error Count
- CRC errors
- Non-CRC FIS errors
- SMART overall health
- Reallocated sectors
- Pending sectors
- Offline uncorrectable
- UDMA CRC errors
- Temperature
- Remaining lifetime
- Program_Fail_Count_Chip
- Erase_Fail_Count_Chip
- Wear_Leveling_Count

##### fsck
In some cases your disk might not be broken, just file system inconsistensies or errors (bad blocks etc) due to improper shutdowns. Fsck scans the file systems and attemt to fix it. Unmount first the device before scanning, unless you know what you are doing. 

If the device is unmounted but throws an error message like the example below. In most cases, I always use a recovery drive or boot to recovery mode to scan device that is mounted to boot/root/recovery, there are some method which you temporary mount it to a directory, but we will not cover that. 

In my case the device is mounted in `/srv/ssd`. 
```
# Check disk mounts or just use df -h
lsblk -f
NAME          FSTYPE FSVER LABEL     UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
sda                                                                                      
└─sda1        ext4   1.0   data      289429cd-429f-43b2-b6c6-f5455c6dda6c                
zram0                                                                                    [SWAP]
nvme0n1                                                                                  
├─nvme0n1p1   vfat   FAT32           7862-B414                               424M    58% /boot/efi
├─nvme0n1p2   vfat   FAT32           7862-B38D                               1.1G    71% /recovery
├─nvme0n1p3   ext4   1.0             50fcc7ca-aedb-4f2f-9f1e-397dfeb09027  177.3G    16% /
└─nvme0n1p4   swap   1               093c81f3-30bf-4688-9612-1a41f8955898                
  └─cryptswap swap   1     cryptswap eb66fb4b-9c2e-4825-a386-e1e512223b97                [SWAP]

# try to unmount
umount -f /srv/ssd # got an error
fsck from util-linux 2.39.3
e2fsck 1.47.0 (5-Feb-2023)
/dev/sda1 is in use.
e2fsck: Cannot continue, aborting. 

# to force unmount
echo 1 | sudo tee /sys/block/sda/device/delete
echo "- - -" | sudo tee /sys/class/scsi_host/host*/scan

# check disk, notice that it is now remounted in in /dev/sdb
sudo fdisk -l

Disk /dev/sdb: 111.79 GiB, 120034123776 bytes, 234441648 sectors
Disk model: Ramsta SSD S800 
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: gpt
Disk identifier: 5BFD6FBA-560B-4166-A769-E873998917F9

Device     Start       End   Sectors   Size Type
/dev/sdb1   2048 234440703 234438656 111.8G Linux filesystem
```

Run fsck and try to fix errors. 
```
fsck -fy /dev/sdb1
fsck from util-linux 2.39.3
e2fsck 1.47.0 (5-Feb-2023)
data: recovering journal
Pass 1: Checking inodes, blocks, and sizes
Pass 2: Checking directory structure
Pass 3: Checking directory connectivity
Pass 4: Checking reference counts
Pass 5: Checking group summary information
Free blocks count wrong (8050503, counted=27795691).
Fix? yes

Free inodes count wrong (7241024, counted=7325485).
Fix? yes


data: ***** FILE SYSTEM WAS MODIFIED *****
data: 6355/7331840 files (0.3% non-contiguous), 1509141/29304832 blocks
```

#### trim
TRIM is used to optmized and increate longetivity of SSD by discarding the data blocks that no longer in use in the drive. 

This is automatically started in the system, just to make sure check if the service is runing. 
```
systemctl status fstrim.timer
```
In mounting disk in `/etc/fstab`, make sure to add *discard* in the option to automatically trimmed. 
```
UUID="289429cd-429f-43b2-b6c6-f5455c6dda6c"   /srv/ssd   ext4  defaults,noatime,discard  0  2
```
Manually run TRIM.
```
fstrim -av
```
#### Logs

##### logrotate
This is automatically enabled on your system, this basically archived and eventually delete your old logs.
*/etc/logrotate.conf*
```
# see "man logrotate" for details
# global options do not affect preceding include directives
# rotate log files weekly
weekly
# use the adm group by default, since this is the owning group
# of /var/log/.
su root adm
# keep 1 weeks worth of backlogs
rotate 1
# create new (empty) log files after rotating old ones
create
# use date as a suffix of the rotated file
#dateext
# uncomment this if you want your log files compressed
#compress
# packages drop log rotation information into this directory
include /etc/logrotate.d
# system-specific logs may also be configured here.
```
To add a custom directory to rotate, add the config file in */etc/logrotate.d/*.
*maddy*
```
cat /etc/logrotate.d/maddy
/srv/volume/maddy/log/maddy.log {
    weekly
    rotate 2
    compress
    missingok
    notifempty
}
```
##### journald
Usually `journald` hogs disk space if left to default configuration.  

Reduce to a specific size (e.g., 500MB):
```
journalctl --vacuum-size=100M
```
```
sudo journalctl --vacuum-time=2weeks
```
Check current disk usage:
```
journalctl --disk-usage
```
Configure permanent limit.
*etc/systemd/journald.conf*
```
[Journal]
SystemMaxUse=200M
```
#### Docker System Usage

##### image/builder/volume
Docker eating up your disk, to get an overview on you docker system. You can see below that the build cache is filling up the disk. 
```
docker system df
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          7         6         7.491GB   7.242GB (96%)
Containers      5         2         938kB     159.7kB (17%)
Local Volumes   0         0         0B        0B
Build Cache     47        0         4.213GB   1.332GB
```
Some command to prune docker resources. Most of the time this would be enough to free up some space.
```
docker builder prune
docker image prune
```
If you are brave enough (to do this in production).
```
docker system prune -a
docker system prune -a --volumes
```
##### logs
Find space used by container logs.
```
docker ps --format '{{.Names}}' | while read c; do
  echo "$c: $(docker logs --tail 1 $c 2>&1 | wc -c) bytes";
done

docker ps --format '{{.Names}}' | while read c; do
  echo "$c: $(docker logs --tail 1 $c 2>&1 | wc -c) bytes";
done
beszel-agent: 61 bytes
autodiscover: 0 bytes 
traefik: 311 bytes
gerbil: 67 bytes
pangolin: 120 bytes
traefik-certs-dumper: 0 bytes
cloudflared: 169 bytes
newt: 59 bytes
dockge: 84 bytes
```

Limting the logs file in container. Editing docker daemon/config.

*/etc/docker/daemon.json*
```
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Defining in compose file.
```
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```
 