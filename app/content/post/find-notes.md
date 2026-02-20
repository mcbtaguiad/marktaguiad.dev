---
title: "Power Rangers: Find Force"
date: 2026-02-19
author: "Mark Taguiad"
tags: ["find"]
UseHugoToc: true
weight: 2
---

{{< imglink src="/images/linux/ranger-vim-sed-awk-find/power-rangers.png" alt="imagen" >}}
{{< toc >}}

### What is Find?
`Find` searches for files and directories based on name, type, size, time, permissions, owner, and more.
```sh
find [path] [options] [expression]
```
### Find by name
```sh
find . -name "file.txt"
```
#### Case senstive
```sh
find . -iname "file.txt"
```
### Find by file type
```sh
find . -type f    # files
find . -type d    # directories
find . -type l    # symlinks
```
### Find in a specific directory
```sh
find /var/log -name "*.log"
```
### Limit search depth
```sh
find . -maxdepth 1 -name "*.txt"
```
### Find by size
```sh
find . -size 10M     # exactly 10 MB
find . -size +10M    # larger than 10 MB
find . -size -10M    # smaller than 10 MB
```
### Find by time
#### Modified time
```sh
find . -mtime 7     # modified exactly 7 days ago
find . -mtime -7    # modified within last 7 days
find . -mtime +7    # older than 7 days
```
#### Access time
```sh
find . -atime -1    # accessed today
```
#### Changed time
```sh
find . -ctime -1
```
### Find empty files and directories
```sh
find . -empty
```
### Find by permissions
```sh
find . -perm 644
```
#### Executable files
```sh
find . -perm /111
```
### Find by owner
```sh
find . -user root
find . -group www-data
```
### Combination Conditions
-and (default)
-or
! (NOT)
#### AND
```sh
find . -type f -and -name "*.txt"
```
#### OR 
```sh
find . -name "*.jpg" -or -name "*.png"
```
#### NOT
```sh
find . ! -name "*.txt"
```
### Actions with -exec
#### Delete files
```sh
find . -name "*.tmp" -delete
```
or
```sh
find . -name "*.tmp" -exec rm {} \;
```
#### Run commands on results
```sh 
find . -name "*.log" -exec ls -lh {} \;
```
#### Use + for better performance
```sh
find . -name "*.jpg" -exec rm {} +
```
### Advance Usage
#### Find and pipe safely with space
```sh
find . -name "*.jpg" -print0 | xargs -0 rm
```
#### Find large files (top space users)
```sh
find / -type f -size +100M 2>/dev/null
```
#### Find files modified in last 10 minutes
```sh
find . -mmin -10
```
#### Find files and copy them
```sh
find . -name "*.conf" -exec cp {} /backup/ \;
```
#### Find duplicate filenames
```sh
find . -type f -printf "%f\n" | sort | uniq -d
```
#### Find broken symlinks
```sh
find . -xtype l
```
#### Exclude directories
```sh
find . -path "./node_modules" -prune -o -name "*.js" -print
```
#### Find large log files older than 30 days and delete
```sh
find /var/log -type f -name "*.log" -size +100M -mtime +30 -delete
```


