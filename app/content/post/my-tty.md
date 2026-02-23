---
title: "my tty"
date: 2026-02-21
author: "Mark Taguiad"
tags: ["tmux", "zsh", "tty", "terminal-emulator"]
UseHugoToc: true
weight: 2
---
{{< info >}}
no pun intended hahahaha
{{< /info >}}

{{< imglink src="/images/linux/my-tty.png" alt="imagen" >}}

{{< toc >}}

### alacritty
I recommend alacritty or st for terminal emulator - but you do you. 
#### install
```bash
apt install alacaritty
```
#### config
*~/.config/alacritty/alacritty.toml*
```toml
[colors.bright]
black = "0x4c4c4c"
blue = "0xa39ec4"
cyan = "0x9ec3c4"
green = "0x9ec49f"
magenta = "0xc49ec4"
#orange = "0xceb188"
red = "0xc49ea0"
white = "0xf5f5f5"
yellow = "0xc4c19e"

[colors.cursor]
cursor = "CellForeground"
text = "CellBackground"

[colors.normal]
black = "0x262626"
blue = "0x8f8aac"
cyan = "0x8aabac"
green = "0x8aac8b"
magenta = "0xac8aac"
#orange = "0xc6a679"
red = "0xac8a8c"
white = "0xe7e7e7"
yellow = "0xaca98a"

[colors.primary]
background = "0x0f0f0f"
foreground = "0xf0f0f0"

[colors.search.focused_match]
background = "0xadd7ff"
foreground = "0x1b1e28"

[colors.search.matches]
background = "0xadd7ff"
foreground = "0x1b1e28"

[colors.selection]
background = "0x303340"
text = "CellForeground"

[colors.vi_mode_cursor]
cursor = "CellForeground"
text = "CellBackground"

[cursor]
style = "Underline"
vi_mode_style = "Underline"

[env]
TERM = "xterm-256color"
WINIT_X11_SCALE_FACTOR = "1.0"

[font]
size = 11

[font.bold]
family = "IBM Plex Mono"
style = "Bold"

[font.glyph_offset]
y = 0

[font.italic]
family = "IBM Plex Mono"
style = "Italic"

[font.normal]
family = "IBM Plex Mono"
style = "Regular"

[font.offset]
y = 0

[scrolling]
history = 1000
multiplier = 3

[window]
decorations = "none"
opacity = 0.9

[window.dimensions]
columns = 80
lines = 35

[window.padding]
x = 24
y = 24

```
### zsh
I preffer not to complicate things, so let's not reinvent the wheel. Use the script by 
[ohmyzsh](https://github.com/ohmyzsh/ohmyzsh). 
```sh
apt install zsh

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```
Edit *~/.zshrc* to enable plugin and change theme. 

### tmux
#### installation
```
apt install tmux
```
#### install TPM (tmux package manager)
Clone repo.
```sh
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```sh
Create tmux dotfile.
```sh
touch ~/.config/tmux/tmux.conf
```
Then add this to your tmux config.
*~/.tmux.conf*
```
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-sensible'


run '~/.tmux/plugins/tpm/tpm'
```

#### tmux hierarchy
tmux has a three-level hierarchy:
1. Session – the top-level container. A session can have multiple windows.
2. Window – each session can have multiple windows, like tabs.
3. Pane – each window can be split into multiple panes (horizontally or vertically).

Visually:
```
Session: mysession
└─ Window: editor
   ├─ Pane: vim
   └─ Pane: bash
└─ Window: logs
   └─ Pane: tail -f /var/log/syslog
```

#### Cheatsheet
These are just some of the commands I usually use, to know more about other (advance) command please visit this [link.](https://tmuxcheatsheet.com/)

##### session cheatsheet
**Attach**
| Key | Action |
| ----| -------|
| tmux | create new session |
| tmux new -s my-session | create new session |
| tmux ls | list session while outside tmux |
| tmux attach | attach to recent session |
| tmux attach -t my-session | attach to specific session |
| ctrl + b s | list session while inside session |
| ctrl + b ( or) | move to next or previous session |

**Kill**
| Key | Action |
| ----| -------|
| tmux kill-session -t my-session | kill specific session |
| tmux kill-session -a -t my-session | kill all except current session |
| ctrl + b $ | rename session |
| ctrl + b d | dettach from sessin |


##### window cheatsheet
| Key | Action |
| ----| -------|
| ctrl + b c | create new window |
| ctrl + b & | close current window |
| ctrl + b , | rename current window |
| ctrl + b w | list windows |
| ctrl + b n or p | next or previous window |
| ctrl + b 0 ... 9 | switch window number |

##### pane cheatsheet
| Key | Action |
| ----| -------|
| ctrl + b % | split window horizontal |
| ctrl + b " | split window vertical |
| ctrl + b arrow key | navigate panes (change focus) |
| ctrl + b { or } | swap panes |
| ctrl + b q 0 ... 9 | swap panes using number key |
| ctrl + b z | toggle pane zoom |
| ctrl + b ! | convert pane into a window |


#### Plugins 
I'll update this section, too lazy to add all. Maybe I'll list the most important for productivity. 
