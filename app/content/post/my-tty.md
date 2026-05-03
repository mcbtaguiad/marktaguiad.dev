---
title: "my tty"
date: 2026-02-21
author: "Mark Taguiad"
tags: ["tmux", "zsh", "tty", "terminal-emulator", "nixos"]
UseHugoToc: true
weight: 2
---
{{< info >}}
no pun intended hahahaha
{{< /info >}}

{{< imglink src="/images/linux/my-tty.png" alt="imagen" >}}

# Table of Contents
{{< toc >}}

### terminal emulator
I recommend alacritty or kitty for terminal emulator - but you do you. 
#### kitty
```bash
apt install kitty
```
*kitty.conf*
```
# Theme
include mocha.conf

# Transparency
background_opacity 0.85

# Font
font_family IBM Plex Mono
font_size 10.0

# Cursor
cursor_shape beam

# Padding
window_padding_width 8

hide_window_decorations yes

wayland_titlebar_color background

confirm_quit no

confirm_os_window_close 0

cursor_trail 3
```
For theme I'm using catppuccin mocha as theme.
*mocha.conf*
```bash
# The basic colors
foreground              #cdd6f4
background              #1e1e2e
selection_foreground    #1e1e2e
selection_background    #f5e0dc

# Cursor colors
cursor                  #f5e0dc
cursor_text_color       #1e1e2e

# Scrollbar colors
scrollbar_handle_color  #9399b2
scrollbar_track_color   #45475a

# URL color when hovering with mouse
url_color               #f5e0dc

# Kitty window border colors
active_border_color     #b4befe
inactive_border_color   #6c7086
bell_border_color       #f9e2af

# OS Window titlebar colors
wayland_titlebar_color system
macos_titlebar_color system

# Tab bar colors
active_tab_foreground   #11111b
active_tab_background   #cba6f7
inactive_tab_foreground #cdd6f4
inactive_tab_background #181825
tab_bar_background      #11111b

# Colors for marks (marked text in the terminal)
mark1_foreground #1e1e2e
mark1_background #b4befe
mark2_foreground #1e1e2e
mark2_background #cba6f7
mark3_foreground #1e1e2e
mark3_background #74c7ec

# The 16 terminal colors

# black
color0 #45475a
color8 #585b70

# red
color1 #f38ba8
color9 #f38ba8

# green
color2  #a6e3a1
color10 #a6e3a1

# yellow
color3  #f9e2af
color11 #f9e2af

# blue
color4  #89b4fa
color12 #89b4fa

# magenta
color5  #f5c2e7
color13 #f5c2e7

# cyan
color6  #94e2d5
color14 #94e2d5

# white
color7  #bac2de
color15 #a6adc8
```
#### alacritty
```bash
apt install alacritty
```
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
#### nixos
```bash
programs.zsh = {
    enable = true;
    ohMyZsh = {
      enable = true;
      plugins = [
        "git"
        "z"
      ];
      theme = "robbyrussell";
    };
  }
``` #### other unix system
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
```
Create tmux dotfile.
```sh
touch ~/.config/tmux/tmux.conf
```
Then add this to your tmux config.
*~/.config/tmux/tmux.conf*
```
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-sensible'

run '~/.tmux/plugins/tpm/tpm'
```
Now run `tmux`. To intall and reload plugin use `ctrl + b I`.
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
| ctrl + b & | kill current window |

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


#### Configs and Plugins 
I'll remove other config and plugin in the sections below to better understand the config. 
##### Start Your Tmux Window and Pane Index Count at 1 Instead of 0
*~/.config/tmux/tmux.conf*
```
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-sensible'

# Start windows and panes index at 1, not 0.
set -g base-index 1
setw -g pane-base-index 1

# Ensure window index numbers get reordered on delete.
set-option -g renumber-windows on

run '~/.tmux/plugins/tpm/tpm'
```

##### Use h j k l to Navigate Pane
`set -g @plugin 'christoomey/vim-tmux-navigator'`

*~/.config/tmux/tmux.conf*
```
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-sensible'

set -g @plugin 'christoomey/vim-tmux-navigator'

# Jump directly to window 1-9
bind-key -n M-1 select-window -t 1
bind-key -n M-2 select-window -t 2
bind-key -n M-3 select-window -t 3
bind-key -n M-4 select-window -t 4
bind-key -n M-5 select-window -t 5
bind-key -n M-6 select-window -t 6
bind-key -n M-7 select-window -t 7
bind-key -n M-8 select-window -t 8
bind-key -n M-9 select-window -t 9

run '~/.tmux/plugins/tpm/tpm'
```

##### Theme
*~/.config/tmux/tmux.conf*
```
set -g @plugin 'tmux-plugins/tpm'

# Theme - gruvbox
set -g @plugin 'egel/tmux-gruvbox'
# set desired theme options...
set -g @tmux-gruvbox 'dark' # or 'dark256', 'light', 'light256'

run '~/.tmux/plugins/tpm/tpm'
```

##### Update and Reload Tmux
1. `source ~/.config/tmux/tmux.conf`
2. open `tmux`
3. `ctrl + b I` - to reload

#### nixos
```bash
  programs.tmux = {
    enable = true;
    baseIndex = 1;
    newSession = true;
    # Stop tmux+escape craziness.
    escapeTime = 0;
    # Force tmux to use /tmp for sockets (WSL2 compat)
    secureSocket = false;
    clock24 = true;
    historyLimit = 50000;

    plugins = with pkgs; [
      tmuxPlugins.better-mouse-mode
      tmuxPlugins.catppuccin
      tmuxPlugins.vim-tmux-navigator

    ];

    # Set your base tmux options
    extraConfig = ''
      # Vim-style pane navigation WITHOUT prefix
      bind -n C-h select-pane -L
      bind -n C-j select-pane -D
      bind -n C-k select-pane -U
      bind -n C-l select-pane -R

      # Jump directly to window 1-9
      bind-key -n M-1 select-window -t 1
      bind-key -n M-2 select-window -t 2
      bind-key -n M-3 select-window -t 3
      bind-key -n M-4 select-window -t 4
      bind-key -n M-5 select-window -t 5
      bind-key -n M-6 select-window -t 6
      bind-key -n M-7 select-window -t 7
      bind-key -n M-8 select-window -t 8
      bind-key -n M-9 select-window -t 9

      # Theme plugins
      set -g @plugin 'catppuccin/tmux#v2.1.3'
      set -g @catppuccin_flavor 'mocha'
    '';
  };
```


