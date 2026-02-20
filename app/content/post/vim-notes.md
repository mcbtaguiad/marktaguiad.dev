---
title: "Esc to Morph"
date: 2026-02-16
author: "Mark Taguiad"
tags: ["vim"]
UseHugoToc: true
weight: 2
---
{{< info >}}
This will be updated if I have the time - backlog since 2019, left in old repo to forget.
{{< /info >}}

<!-- [![imagen](/images/linux/ranger-vim-sed-awk-find/morph.jpg)](/images/linux/ranger-vim-sed-awk-find/morph.jpg) -->

{{< imglink src="/images/linux/ranger-vim-sed-awk-find/morph.jpg" alt="imagen" >}}

# Table of Contents
{{< toc >}}

### Mode
#### Normal Mode
This is the default mode. When you press `Escape` when in Insert mode you will exit to Normal mode. This is used in moving the cursur, deleting characters, words, lines etc. Operation like copy and paste is also done in this mode. 

#### Insert Mode
You can switch to this mode using pressing `i` or `Insert`. This is the default behavior in a editors. 

#### Basics
| Key        | Action           |
| ---------- | ---------------- |
| u          | undo             |
| ctrl+r     | redo             |
| d          | delete line      |

### Movement
You need to be in **normal mode**.
#### by Character
Refer table below to move by character. 
| Key        | Action        |
| ---------- | ------------- |
| h          | left          |
| j          | down          |
| k          | up            |
| l          | right         |

Alternatively you can use the arrow button, but vim was built for **efficiency**. 
#### by Words
| Key        | Action                      | Remarks (cursor is \|) |
| ---------- | --------------------------- | ---------------------- |
| w          | move to the next word       | first second \|third   |
| e          | move to the end of the word | first second third\|   |
| b          | move back a word            | first \|second third   |

### Insert Mode

| Key        | Action                                | Remarks (cursor is \|) |
| ---------- | ------------------------------------- | ---------------------- |
| i          | enter insert mode before your cursor  | \|word                 |
| a          | enter insert mode after your cursor   | w\|ord                 |
| esc        | go back to normal mode                |                        |

#### Insert at Line Ends
No matter where you are in the line. When you these key you will Insert Mode and will be in the begiining of the line or at the end of theThe r operator is useful when you want to replace a single character with another character. It's a nice way to quickly correct a typo without leaving normal mode.

The s operator is useful when you want to replace a single character with multiple characters via insert mode. line. 
| Key        | Action                                        | Remarks (cursor is \|) |
| ---------- | --------------------------------------------- | ---------------------- |
| shift + i  | enter insert mode at the beginning of a line  | \|a short line.        |
| shift + a  | enter insert mode at the end of a line        | a short line.\|        |
| esc        | go back to normal mode                        |                        |

#### Opening New Lines
Add a new line above or below your cursor and then enter insert mode on that line.
| Key        | Action                                |
| ---------- | ------------------------------------- |
| o          | open a new line below the cursor      |
| shift + o  | open a new line above the cursor      |

#### Making Small Edits
| Key        | Action                                |
| ---------- | ------------------------------------- |
| x          | delete the character under the cursor   |
| s          | delete the character under your cursor and enter insert mode. |
| r          | replace the character under your cursor with the next character you type Example|

The r operator is useful when you want to replace a single character with another character. It's a nice way to quickly correct a typo without leaving normal mode.

The s operator is useful when you want to replace a single character with multiple characters via insert mode.

### Essebtial Motions
#### Moving by Uppercase WORDs
The uppercase variants of the word motions.
| Key        | Action                      |
| ---------- | --------------------------- |
| shift + w  | move to the next WORD       |
| shift + e  | move to the end of the WORD |
| shift + b  | move back a WORD            |

#### Moving to Line Ends
| Key        | Action                           |
| ---------- | -------------------------------- |
| 0          | move to the beginning of a line  |
| $          | move to the end of a line        |
| _          | move to the first word in a line |

#### Find Motion
Quickly jump to a specific character within a line.
| Key          | Action                                                             |
| -------------| ------------------------------------------------------------------ |
| f char       | move to the beginning of a line.                                   |
| F char       | move backward to the previous occurrence of {char} within the line.|
| ;            | repeat the last find motion.                                       |
| df char (df,)| delete until comma                                                 |
| cf char (cf,)| change until until comma                                                 |
#### Till Motion
Quickly jump till (just before) a specific character within a line.
| Key        | Action                                                                              |
| ---------- | ------------------------------------------------------------------------------------|
| t char     | move forward till (just before) the next occurrence of {char} within the line.      |
| T char     | move backward till (just before) the previous occurrence of {char} within the line. |
| ;          | repeat the last find motion.                                                        |

### Operators
Operators are commands that perform actions on text. Operators must be followed by a motion to specify what part of the text to operate on.
#### Delete word
| Key       | Action                                       |
| --------- | -------------------------------------------- |
| dw        | delete a word                                |
| db        | delete backward to start of previous word    |
| de        | delete to end of word (keeps trailing space) |

#### Delete WORD
| Key       | Action                                       |
| --------- | -------------------------------------------- |
| DW        | delete WORD (space-separated)                |
| DB        | delete backward WORD                         |
| DE        | delete to end of WORD                        |

#### Delete Line/Character
| Key        | Action                   |
| ---------- | ------------------------ |
| dd         | delete line              |
| D or d$    | delete to end of line    |
| d0         | delete to start of line  |
| x          | delete char              |
| X          | delete char backward     |

#### Delete Text Object
| Key        | Action                   |
| ---------- | -------------------------------- |
| diw        | delete inner word                |
| daw        | delete a word (with space)       |
| di"        | delete inside quotes             |
| da"        | delete around quotes             |
| di(        | delete inside parentheses        |
| da(        | delete around parentheses        |
| di{        | delete inside quotes             |
| da{        | delete braces/brackets           |
| dap        | delete a paragraph               |

#### Counts with dw
| Key        | Action           |
| ---------- | ---------------- |
| d2w        | delete 2 words   |
| 3dw        | same as above    |

#### Change word
| Key       | Action                      |
| --------- | --------------------------- |
| cw        | change to next word start   |
| cb        | change backward word        |
| ce        | change to end of word       |

#### Change WORD
| Key       | Action                   |
| --------- | ------------------------ |
| cW        | change WORD              |
| cB        | change backward WORD     |
| cE        | change to end of WORD    |

#### Change Line/Character
| Key        | Action                        |
| ---------- | ----------------------------- |
| cc         | change line                   |
| C or c$    | change to end of line         |
| c0         | change to start of line       |
| s          | change char (delete + insert) |
| S          | change whole line             |
#### Change Text Object
| Key        | Action                           |
| ---------- | -------------------------------- |
| ciw        | change inner word                |
| caw        | change a word (with space)       |
| ci"        | change inside quotes             |
| ca"        | change around quotes             |
| ci(        | changeinside parentheses         |
| ca(        | change around parentheses        |
| ci{        | change inside quotes             |
| ca{        | change inside braces/brackets    |
| cap        | change a paragraph               |


#### Delete Multiple Line
| Key       | Action                      |
| --------- | --------------------------- |
| 2dd       | delete 2 lines              |
| dG        | delete to end of file       |
| dgg       | delete to start of file     |
| d}        | delete to next paragraph    |
| 2d}       | deletes 2 paragraphs        |

### Copy/Paste
#### Copy words
| Key       | Action                           |
| --------- | -------------------------------- |
| yw        | copy word (to next word start)   |
| yiw       | copy inner word (most useful)    |
| yaw       | copy a word (includes space)     |
| yw2       | copy 2 words                     |
| yW        | copy WORD (space-separated)      |
#### Copy lines
| Key       | Action                           |
| --------- | -------------------------------- |
| yy        | copy current line                |
| 5yy       | copy 5 lines                     |
| y$        | opy to end of line               |
| y0        | copy to start of line            |

#### Basic Paste
| Key        | Action                              |
| ---------- | ----------------------------------- |
| p          | paste after cursor (or below line)  |
| P          | paste before cursor (or above line) |
| 3p         | paste 3 times                       |

#### System clipboard
| Key        | Action                              |
| ---------- | ----------------------------------- |
| "+yy       | copy line to system clipboard       |
| "+p        | Paste from system clipboard         |


### Find
#### Word search under cursor
| Key        | Action                                |
| ---------- | ------------------------------------- |
| *          | search forward for word under cursor  |
| #          | search backward for word under cursor |
| g*         | forward partial                       |
| g#         | backward partial                      |


### Vertical Jump
#### Top / bottom
| Key       | Action                      |
| --------- | --------------------------- |
| gg        | go to first line            |
| G         | go to last line             |
| nG (10G)  | go to line n                |

#### Paragraph jumps
| Key       | Action                      |
| --------- | --------------------------- |
| {         | jump to previous paragraph  |
| }         | jump to next paragraph      |
| n{ / n}   | jump multiple paragraphs    |

#### Half-page jumps (scroll + move cursor)
| Key       | Action                      |
| --------- | --------------------------- |
| Ctrl+d    | half page down              |
| Ctrl+u    | half page up                |

### EX Mode
To enter EX mode press `:`. 

#### Show Line Numbers
`:set number`

#### Go to line
`:n`

#### Full Search
| Key       | Action                |
| --------- | --------------------- |
| /pattern  | search forward        |
| ?pattern  | search backward       |

Press:\
`n` → next match \
`N` → previous match

#### Search Parameter
| Key             | Action                              |
| --------------- | ----------------------------------- |
| :set ignorecase | case insensitive                    |
| :set smartcase  | case sensitive if uppercase used    |
| /foo\c          | ignore case                         |
| /foo\C          | match case                          |
#### Search and Replace
| Key             | Action                              |
| --------------- | ----------------------------------- |
| :s/old/new/     | Current line                        |
| :%s/old/new/g   | Whole file                          |
| :%s/old/new/gc  | With confirmation                   |

#### Search range
| Key                  | Action                              |
| -------------------- | ----------------------------------- |
| :5,10s/foo/bar/g     | only lines 5–10                     |
| :.,$s/foo/bar/g      | current line to end                 |

#### Save/Quit
| Key       | Action                |
| --------- | --------------------- |
| :w        | save                  |
| :q        | quit                  |
| :qw       | save and quit         |
| :q!       | force quit            |
| :qw!      | save and force quit   |

#### Delete Lines 
| Key       | Action                             |
| --------- | ---------------------------------- |
| :5,10d    | delete lines 5 to 10               |
| :.,+4d    | delete current line + next 4 lines |
| :%d       | delete entire file                |

#### Copy/Paste
`:start,endy`

| Key       | Action                             |
| --------- | ---------------------------------- |
| :5,10y    | copy lines 5–10                    |
| :.,+4y    | copy current line + next 4         |
| :%y       | copy entire file                   |
### Visual Mode
To enter Visual mode press `shift + v`. 

#### Delete Lines
1. V → start linewise visual mode
2. Move **j / k** to select lines
3. Press **d**

#### Copy/Paste
1. v
2. Move cursor (w, e, j, k)
3. y
