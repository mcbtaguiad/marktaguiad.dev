---
title: "Lord Sed"
date: 2026-02-17
author: "Mark Taguiad"
tags: ["sed"]
UseHugoToc: true
weight: 2
---
[![imagen](/images/ranger-vim-sed-awk-find/Lord-Zedd-Cosmic-Fury.png)](/images/ranger-vim-sed-awk-find/Lord-Zedd-Cosmic-Fury.png)

{{< toc >}}

### What is SED?
Sed short for stream editor. It reads input line by line, applies commands and output the results.
- find and replace text
- delete lines
- insert/append text
- extract specific lines
- batch editing files
### Edit and Save
First we must discuss that in default behavior sed don't save the output to the file. Below are some of the common method to ssave to the file.
#### Save to a new file
This is the recommended method, for safety.
```bash
sed 's/old/new/g' file.txt > new.txt
```
#### Overwrite the original - in-place editing
If you are sure what you are doing.
```bash
sed -i 's/old/new/g' file.txt 
```
### Print
#### Print file
```bash
sed '' file.txt

Hello World!
hello world!
Hello World!
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```
#### Print specific line
```bash 
sed -n '4p' file.txt

Dunk it Jonathan!
```
#### Print line range
```bash
sed -n '3,6p' file.txt

Hello World!
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```
#### Print matching lines
```bash
sed -n '/I/p' file.txt

I love you MOM!
```
### Find and Replace
#### Replace first match
```bash
sed 's/Hello/Goodbye/' file.txt

Goodbye World!
hello world!
Goodbye World!
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```
#### Replace all matches
```bash
sed 's/World/Hell/g' file.txt

Hello Hell!
hello world!
Hello Hell!
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```
#### Case sensitive replace
```bash
sed 's/Hello/Goodbye/gi' file.txt

Goodbye World!
Goodbye world!
Goodbye World!
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```
#### Replace only on specific line
```bash
sed '3s/Hello/Goodbye/' file.txt

Hello World!
hello world!
Goodbye World!
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```
### Delete
#### Delete a word
This is the same with replace, just set it to blank.
```sh
sed 's/Dunk//g' file.txt

Hello World!
hello world!
Hello World!
 it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```
#### Delete a line
```sh
sed '5d' file.txt

Hello World!
hello world!
Hello World!
Dunk it Jonathan!
I love you MOM!
```
#### Delete Range
```sh
sed '2,6d' file.txt

Hello World!
```
#### Delete matching line
```sh
sed '/I/d' file.txt

Hello World!
hello world!
Hello World!
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
```
### Insert and Appending
#### Insert before a line
```sh
sed '2i Hey let me in!' file.txt

Hello World!
Hey let me in!
hello world!
Hello World!
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```
#### Append after a lin
```sh
sed '3a Dunk it Jonathan!' file.txt

Hello World!
hello world!
Hello World!
Dunk it Jonathan!
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```
#### Insert before match
```sh
sed '/Dunk/i Lalaland' file.txt

Hello World!
hello world!
Hello World!
Lalaland
Dunk it Jonathan!
Nagrigat agbiyag ditoy lubong.
I love you MOM!
```

### Regex
Let's first change the content of file.txt to better demostrate regex.
*file.txt*
```txt
Hello World!
hello world!
<pusa>
1 2 3 takbo...
pelepens; flood control;
Dunk it Jonathan!
```
#### Word boundary match
```sh
sed 's/\<pusa\>/aso/g' file.txt

Hello World!
hello world!
<aso>
1 2 3 takbo...
pelepens; flood control;
Dunk it Jonathan!
```
#### Replace Number
```sh
sed 's/[0-2]\+/baliw/g' file.txt

Hello World!
hello world!
<pusa>
baliw baliw 3 takbo...
pelepens; flood control;
Dunk it Jonathan!
```

#### Capture groups
```sh
sed 's/\(hello\) \(world\)/\2, \1/gi' file.txt

World, Hello!
world, hello!
<pusa>
1 2 3 takbo...
pelepens; flood control;
Dunk it Jonathan!
```
### Multiple Commands
```sh 
sed -e 's/Dunk/Shoot/' -e 's/takbo/talon/' file.txt

Hello World!
hello world!
<pusa>
1 2 3 talon...
pelepens; flood control;
Shoot it Jonathan!
```
#### Using semicolon
```sh
sed -e 's/Dunk/Shoot/; s/takbo/talon/' file.txt

Hello World!
hello world!
<pusa>
1 2 3 talon...
pelepens; flood control;
Shoot it Jonathan!
```
### Conditional Execution
#### Run command only on matching line
```sh
sed '/orld/s/Hello/bubble gum/gi' file.txt

bubble gum World!
bubble gum world!
<pusa>
1 2 3 takbo...
pelepens; flood control;
Dunk it Jonathan!
```
### Real world example
#### Removing blank lines
```sh
sed '/^$/d'
```
#### Remove trailing spaces
```sh
sed 's/[ \t]*$//'
```
#### Number lines
```sh
sed '=' file.txt | sed 'N;s/\n/ /'

1 Hello World!
2 hello world!
3 <pusa>
4 1 2 3 takbo...
5 pelepens; flood control;
6 Dunk it Jonathan!
```
#### Extract between two patterns
```sh
sed -n '/1/,/flood/p' file.txt

1 2 3 takbo...
pelepens; flood control;
```
### Scripts
Create file `script.sed`.
```bash
s/hello/world/g
s/\<pusa\>/aso/g
```
Run.
```bash
sed -f script.sed file.txt

Hello World!
world world!
<aso>
1 2 3 takbo...
pelepens; flood control;
Dunk it Jonathan!
```

