---
title: "Esc the Matrix Neovim "
date: 2026-02-23
author: "Mark Taguiad"
tags: ["nvim", "vim"]
UseHugoToc: true
weight: 2
---
{{< warning >}}
See old post [here](/post/vim-notes/) before you proceed with neovim.
{{< /warning >}}

{{< imglink src="/images/linux/matrix/neo_fly.gif" alt="imagen" >}}

This will be configured with NixOS, I recommend [kickstart.nvim](https://github.com/nvim-lua/kickstart.nvim) if you are running other system. Or check my neovim setup with my ubuntu server - [repo](https://github.com/mcbtaguiad/dotfile-neovim).

# Table of Contents
{{< toc >}}

### Why Neovim?
Let's be honest, because you find it cool - not using the mouse or just like me who like using the nipple (trackpoint). In this post let's try to replicate IDE like vscode - this also a note for my stupid self who always forget the binding and commands. 

### Core Setup
#### Basic Config
Let's use the template from NixOS official documenation. Configs will be using `lua` syntax.
```bash 
programs.neovim = {
  enable = true;
  configure = {
    customRC = ''
    lua << EOF

    vim.o.sessionoptions = "buffers,curdir,tabpages,winsize,help,globals,localoptions"

    EOF
    '';
    packages.myVimPackage = with pkgs.vimPlugins; {
      start = [ ctrlp ];
    };
  };
};
```

#### Leader Keys
Use `space` as the leader key for all the custom shortcuts.
```bash
-- [[ Leader keys ]]
vim.g.mapleader = ' '
vim.g.maplocalleader = ' '
```
#### Editor Options
Most of the function are also available in `vim`. These are some of the neccessary basic config.
```bash
vim.o.number = true
vim.o.mouse = 'a'
vim.o.showmode = false
vim.schedule(function() vim.o.clipboard = 'unnamedplus' end)
vim.o.breakindent = true
vim.o.undofile = true
vim.o.ignorecase = true
vim.o.smartcase = true
vim.o.signcolumn = 'yes'
vim.o.updatetime = 250
vim.o.timeout = true
vim.o.timeoutlen = 500
vim.o.splitright = true
vim.o.splitbelow = true
vim.o.list = true
vim.opt.listchars = { tab = '» ', trail = '·', nbsp = '␣' }
vim.o.inccommand = 'split'
vim.o.cursorline = true
vim.o.scrolloff = 10
vim.o.confirm = true
```

- Line numbers
- Mouse support
- No mode display (handled by statusline)
- Clipboard
- Persistent undo
- Smart case search
- Always show sign column
- Invisible Character
- Split right & below
- Cursorline
- Scroll offset = 10
- Confirm before closing modified buffers

### Basic Keymaps
#### Clear search highlight
```bash
vim.keymap.set('n', '<Esc>', '<cmd>nohlsearch<CR>')
```
#### Window Navigation
Default keys uses `Ctrl + w h j k l`. But here we set it up to `Ctrl + h j k l`. 
```bash
-- [[ Basic keymaps ]]
vim.keymap.set('n', '<C-h>', '<C-w><C-h>')
vim.keymap.set('n', '<C-l>', '<C-w><C-l>')
vim.keymap.set('n', '<C-j>', '<C-w><C-j>')
vim.keymap.set('n', '<C-k>', '<C-w><C-k>')
```
#### Split
Default key and not overide. 
| Key | Action |
| --- | --- |
| :split or :sp | horizontal split |
| :vsplit or : vp | vertical split | 
| :q or :close | close the windows and split |
| Ctrl + w s  | horizontal split | 
| Ctrl + w v | vertical split | 

For some reason the window resize is not working. Add this in customRC. Hold `Ctrl + w h j k l` to resize the current window (in split). 
```bash
vim.keymap.set("n", "<C-Up>",    "<cmd>resize +2<CR>",          { desc = "Increase window height" })
vim.keymap.set("n", "<C-Down>",  "<cmd>resize -2<CR>",          { desc = "Decrease window height" })
vim.keymap.set("n", "<C-Left>",  "<cmd>vertical resize -2<CR>", { desc = "Decrease window width" })
vim.keymap.set("n", "<C-Right>", "<cmd>vertical resize +2<CR>", { desc = "Increase window width" })
```

#### Buffer
Buffer is a file loaded into memory for editing. Let's just add a [bufferline](https://github.com/akinsho/bufferline.nvim) plugin for easy navigation like in vscode. Opened file are displayed in the top. 
```bash
-- [[ Bufferline ]] 
require("bufferline").setup({
  options = {
    mode = "buffers",
    diagnostics = "nvim_lsp",
    separator_style = "slant",
    always_show_bufferline = false,
  },
})

vim.keymap.set("n", "<S-h>", "<cmd>BufferLineCyclePrev<CR>", { desc = "Prev buffer" })
vim.keymap.set("n", "<S-l>", "<cmd>BufferLineCycleNext<CR>", { desc = "Next buffer" })
vim.keymap.set("n", "<leader>bd", "<cmd>bdelete<CR>", { desc = "Delete buffer" })
```
Add in `pkgs.vimPlugins`.
```
bufferline-nvim
```
| Key | Action |
| --- | --- |
| :bnext or :bn | switch next | 
| :bprevious or : bp | switch previous |
| :ls | list buffer | 
| :bd | close buffer |

#### Comment
Built-in commenting and uncommenting lines. If you are interested with more advance comment plugin, check this [linl](https://github.com/numToStr/Comment.nvim).
| Key | Action| 
| --- | --- |
| gcc | toggle command or uncomment | 
| [num] gcc | multiple line |

### Status
#### Status line
Shows: mode, branch, filename, diagnostics, LSP status. Plugin used is [lualine](https://github.com/nvim-lualine/lualine.nvim).
```bash
-- [[ Lualine ]]
require("lualine").setup({
  options = {
    theme = "catppuccin",
    globalstatus = true,
    section_separators = "",
    component_separators = "",
  },
  sections = {
    lualine_a = { "mode" },
    lualine_b = { "branch" },
    lualine_c = { { "filename", path = 1 } },
    lualine_x = { "diagnostics", "lsp_status" },
    lualine_y = { "filetype" },
    lualine_z = { "location" },
  },
})
```

Add in `pkgs.vimPlugins`.
```
lualine-nvim
```
#### Git
Git integration
```bash
vim.keymap.set("n", "<leader>gg", ":LazyGit<CR>", { silent = true, desc = "Open LazyGit" })
```
Add in `pkgs.vimPlugins`.
```
lualine-nvim
```
Add in `environment.systemPackages`.
```
lazygit
```

### Theme
I'm using catppuccin(https://github.com/catppuccin/nvim). Some plugin have config for theme, look out for that. 
```bash

-- [[ Theme ]]
-- [[ Catppuccin Theme ]]
require("catppuccin").setup({
  flavour = "mocha", -- latte, frappe, macchiato, mocha
  background = {       -- Optional
    light = "latte",
    dark = "mocha",
  },
  transparent_background = true,
  term_colors = true,
  dim_inactive = { enabled = true },
  styles = {
    comments = { "italic" },
    functions = { "bold" },
  },
})

vim.cmd.colorscheme("catppuccin") -- activates the theme
```


Add in `pkgs.vimPlugins`.
```
catppuccin-nvim
```
### File Navigation & Search
#### Fuzzy Finder
[Telescope](https://github.com/nvim-telescope/telescope.nvim) for me more refined than `fzf-lua`. 
- Find files, live grep, buffers, help
- Resume last search
- Yank file path to clipboard (y / <C-y>)

```bash

-- [[ Telescope ]]
local telescope = require("telescope")
local actions = require("telescope.actions")
local action_state = require("telescope.actions.state")
local builtin = require('telescope.builtin')

-- Setup Telescope
telescope.setup({
  defaults = {
    mappings = {
      i = {
        -- Press <C-y> in insert mode to yank path
        ["<C-y>"] = function(prompt_bufnr)
          local entry = action_state.get_selected_entry()
          local path = entry.path or entry.filename
          vim.fn.setreg("+", path) -- Yank to system clipboard (+)
          vim.fn.setreg("", path)  -- Yank to unnamed register
          print("Yanked: " .. path)
          actions.close(prompt_bufnr)
        end,
      },
      n = {
        -- Press y in normal mode to yank path
        ["y"] = function(prompt_bufnr)
          local entry = action_state.get_selected_entry()
          local path = entry.path or entry.filename
          vim.fn.setreg("+", path)
          vim.fn.setreg("", path)
          print("Yanked: " .. path)
          actions.close(prompt_bufnr)
        end,
      },
    },
  },
  extensions = {
    file_browser = {
      hijack_netrw = true,    -- optionally hijack netrw
      theme = "ivy",
      mappings = {
        i = {
          ["<C-y>"] = function(prompt_bufnr)
            local entry = action_state.get_selected_entry()
            if not entry then return end
            local path = entry.path or entry.filename
            vim.fn.setreg("+", path)
            vim.fn.setreg("", path)
            print("Yanked: " .. path)
            actions.close(prompt_bufnr)
          end,
        },
        n = {
          ["y"] = function(prompt_bufnr)
            local entry = action_state.get_selected_entry()
            if not entry then return end
            local path = entry.path or entry.filename
            vim.fn.setreg("+", path)
            vim.fn.setreg("", path)
            print("Yanked: " .. path)
            actions.close(prompt_bufnr)
          end,
        },
      },
    },
  },
})

-- Load file_browser extension
telescope.load_extension('file_browser')

-- Keymaps
vim.keymap.set('n', '<Space>sf', builtin.find_files)
vim.keymap.set('n', '<Space>sg', builtin.live_grep)
vim.keymap.set('n', '<Space>sb', builtin.buffers)
vim.keymap.set('n', '<Space>sh', builtin.help_tags)
vim.keymap.set('n', '<leader>sr', builtin.resume)
vim.keymap.set('n', '<leader>s.', builtin.oldfiles)

-- File browser keymap
vim.keymap.set('n', '<Space>fb', function()
  telescope.extensions.file_browser.file_browser({
    path = "%:p:h",    -- start in current file's directory
    respect_gitignore = false,
    hidden = true,
  })
end)
``` 
Add in `pkgs.vimPlugins`.
```
telescope-nvim
telescope-file-browser-nvim
```
Add in `environment.systemPackages`.
```
xclip
```
| Key | Action |
| --- | --- | 
| \<Space\> sf | find file |
| \<Space\> sb | live grep |
| \<Space\> sf | buffers |
| \<Space\> sh | help tags |
| \<Space\> sx | resume |
| \<Space\> s. | oldfiles |
| --- | --- |
| \<Space\> fg | open file browser |
| --- | --- |
| Ctrl + y | copy file path (while in `sf`) |

#### File Browser
I've already added a file browser extension in telescope config above. But right now I'm testing [oil](https://github.com/stevearc/oil.nvim), so I'll might as well just put it here.
```bash

-- [[ Oil.nvim ]]
local oil = require('oil')

oil.setup({ default_file_explorer = false })
vim.keymap.set('n', '<Space>o', function() oil.open() end)

-- [[ Format on save ]]
vim.api.nvim_create_autocmd('BufWritePre', {
  callback = function()
    vim.lsp.buf.format({ async = false })
  end,
})
```

Add in `pkgs.vimPlugins`.
```
oil-nvim
```
| Key | Action | 
| --- | ------ | 
| \<Space\> o | open oil |

### Dashboard & Sessions
#### Greeter
[Alpha-nvim](https://github.com/goolord/alpha-nvim) to handle dashboard and greeter.
- New file
- Find file
- Live grep
- File explorer
- Restore session
```bash
-- [[ Alpha Greeter ]]
        local alpha = require("alpha")
        local dashboard = require("alpha.themes.dashboard")

        dashboard.section.header.val = {
          " ",
          "  ███╗   ██╗██╗██╗  ██╗",
          "  ████╗  ██║██║╚██╗██╔╝",
          "  ██╔██╗ ██║██║ ╚███╔╝ ",
          "  ██║╚██╗██║██║ ██╔██╗ ",
          "  ██║ ╚████║██║██╔╝ ██╗",
          "  ╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝",
          " ",
        }

        dashboard.section.buttons.val = {
          dashboard.button("e", "  New file", "<cmd>ene<CR>"),
          dashboard.button("SPC sf", "  Find file"),
          dashboard.button("SPC sg", "  Live grep"),
          dashboard.button("SPC o", "  File explorer"),
          dashboard.button("SPC sl", "  Restore session", "<cmd>SessionManager load_last_session<CR>"),
          dashboard.button("q", "  Quit", "<cmd>qa<CR>"),
        }

        dashboard.section.footer.val = "Minimal Neovim on Nix ❄️"

        alpha.setup(dashboard.opts)

        -- [[ Session Manager ]]
        require("auto-session").setup({
            log_level = "info",
            auto_session_enable_last_session = true,  -- load last session automatically
            auto_session_root_dir = vim.fn.stdpath("data").."/sessions",
            auto_session_enabled = true,
            auto_save_enabled = true,                 -- autosave current session
        })

        vim.keymap.set("n", "<leader>qs", "<cmd>AutoSession save<CR>", { desc = "Session Save" })
        vim.keymap.set("n", "<leader>ql", "<cmd>AutoSession restore<CR>", { desc = "Session Load" })
        vim.keymap.set("n", "<leader>qd", "<cmd>AutoSession delete<CR>", { desc = "Session Stop" })

```

Add in `pkgs.vimPlugins`.
```
alpha-nvim
plenary-nvim
```
#### Session
Auto-save session and auto-restore [session](https://github.com/rmagatti/auto-session).
```bash
-- [[ Session Manager ]]
require("auto-session").setup({
    log_level = "info",
    auto_session_enable_last_session = true,  -- load last session automatically
    auto_session_root_dir = vim.fn.stdpath("data").."/sessions",
    auto_session_enabled = true,
    auto_save_enabled = true,                 -- autosave current session
})
```

Add in `pkgs.vimPlugins`.
```
auto-session
```
| Key | Action |
| --- | --- |
| \<Space\> qs | save |
| \<Space\> ql | load |
| \<Space\> qd | delete |

### Autocomplete & Snippet
#### Snippet
[LuaSnip](https://github.com/L3MON4D3/LuaSnip)
- Loads VSCode-style snippets
- Jump with Tab / Shift-Tab
```bash
-- [[ Autocomplete ]]
local cmp_autopairs = require("nvim-autopairs.completion.cmp")
local cmp = require('cmp')

cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())

local luasnip = require('luasnip')
```
Add in `pkgs.vimPlugins`.
```
nvim-cmp
cmp-nvim-lsp
luasnip
cmp_luasnip
friendly-snippets
nvim-autopairs
```
#### Autocomplete
```bash
-- =========================
--        AUTOCOMPLETE
-- =========================

require('luasnip.loaders.from_vscode').lazy_load()

cmp.setup({
  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },
  mapping = cmp.mapping.preset.insert({
    ['<C-Space>'] = cmp.mapping.complete(),
    ['<CR>'] = cmp.mapping.confirm({ select = true }),
    ['<Tab>'] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_next_item()
      elseif luasnip.expand_or_jumpable() then
        luasnip.expand_or_jump()
      else
        fallback()
      end
    end, { 'i', 's' }),https://github.com/hrsh7th/nvim-cmp
    ['<S-Tab>'] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_prev_item()
      elseif luasnip.jumpable(-1) then
        luasnip.jump(-1)
      else
        fallback()
      end
    end, { 'i', 's' }),
  }),
  sources = {
    { name = 'nvim_lsp' },
    { name = 'luasnip' },
  },
})
```
Add in `pkgs.vimPlugins`.
```
nvim-cmp
cmp-nvim-lsp
luasnip
cmp_luasnip
friendly-snippets
nvim-autopairs
```
#### Autopairs
[nvim-autopairs](https://github.com/windwp/nvim-autopairs)
- Tree-sitter aware pairing
- Integrated with completion confirm
```bash

-- [[ Autopairs ]]
require("nvim-autopairs").setup({
  check_ts = true, -- use treesitter for smarter pairing (recommended)
})
```

Add in `pkgs.vimPlugins`.
```
nvim-autopairs
```
### Language Server Protocol
#### LSP Installer
Mason to handle or manage language servers.
```bash

-- [[ Mason (UI only) ]]
local mason = require('mason')
local mason_lspconfig = require('mason-lspconfig')


mason.setup()
mason_lspconfig.setup({ automatic_installation = false })

local on_attach = function(_, bufnr)
  local opts = { buffer = bufnr }
  vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)
  vim.keymap.set('n', 'gD', vim.lsp.buf.declaration, opts)
  vim.keymap.set('n', 'gr', vim.lsp.buf.references, opts)
  vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, opts)
  vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
  vim.keymap.set('n', '<leader>rn', vim.lsp.buf.rename, opts)
  vim.keymap.set('n', '<leader>ca', vim.lsp.buf.code_action, opts)
  vim.keymap.set('n', '<leader>f', function()
    vim.lsp.buf.format({ async = true })
  end, opts)
end

local capabilities = require('cmp_nvim_lsp').default_capabilities()

local servers = {
  "lua_ls",
  "ts_ls",
  "gopls",
  "pyright",
  "bashls",
  "nil_ls",
}

for _, server in ipairs(servers) do
  vim.lsp.config(server, {
    on_attach = on_attach,
    capabilities = capabilities,
  })
  vim.lsp.enable(server)
end
```
Add in `pkgs.vimPlugins`.
```
nvim-lspconfig
mason-nvim
mason-lspconfig-nvim
```
Add in `environment.systemPackages`.
```bash
lua-language-server
nil
nodePackages.typescript-language-server
gopls
pyright
bash-language-server
```
#### Language
These are the language loaded. Di ko naman alam pano gamitin yang mga language nayan hahahaha. 
```
lua_ls: Lua
ts_ls: TypeScript/JavaScript
gopls: Go (Golang)
pyright: Python
bashls: Bash/Shell Script
nil_ls: Nix 
```
#### Diagnostics
To make the error message beside the code minimal let's add [tiny-inline-diagnostic-nvim](https://github.com/rachartier/tiny-inline-diagnostic.nvim) plugin.
```bash
-- Disable default virtual text
vim.diagnostic.config({
    virtual_text = false,
})

-- tiny-inline-diagnostic setup
require("tiny-inline-diagnostic").setup({
  options = {
    show_source = "if_many",
    multilines = true,
    use_icons_from_diagnostic = true,
    break_line = {
      enabled = true,
      after = 40,
    },
  },
})

-- Your existing keymaps (unchanged)
vim.keymap.set('n', '[d', vim.diagnostic.goto_prev, { desc = 'Go to previous diagnostic' })
vim.keymap.set('n', ']d', vim.diagnostic.goto_next, { desc = 'Go to next diagnostic' })
vim.keymap.set('n', '<leader>e', vim.diagnostic.open_float, { desc = 'Show diagnostic in float' })
vim.keymap.set('n', '<leader>q', vim.diagnostic.setloclist, { desc = 'Set diagnostics in loclist' })
```
Add in `pkgs.vimPlugins`.
```
tiny-inline-diagnostic-nvim
```
#### Linting
[nvim-lint](https://github.com/mfussenegger/nvim-lint)
```bash

-- [[ Lint ]]
local lint = require('lint')

lint.linters_by_ft = {
  javascript = { 'eslint' },
  typescript = { 'eslint' },
  javascriptreact = { 'eslint' },
  typescriptreact = { 'eslint' },
  python = { 'pylint' },
  go = { 'golangcilint' },
  nix = { 'statix', 'deadnix' },
  sh = { 'shellcheck' },
}

local lint_augroup = vim.api.nvim_create_augroup('lint', { clear = true })

vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWritePost', 'InsertLeave' }, {
  group = lint_augroup,
  callback = function()
    lint.try_lint()
  end,
})

vim.keymap.set('n', '<leader>l', function()
  lint.try_lint()
end, { desc = 'Run lint' })
```

Add in `pkgs.vimPlugins`.
```
statix # Nix
deadnix # Nix unused code
eslint # JS/TS
golangci-lint # Go
pylint # Python
shellcheck # Bash
```
Add in `environment.systemPackages`.
```
nvim-lint
```
### Complete Config
Config is too long, check this [link](https://github.com/mcbtaguiad/dotfile-i3-nixos). 

### Commands we learned along the way 
#### Multiple line tab
Enter visual mode, and highlight the lines needed to add tab.
1. `ctrl + v` + arrow key to select the block
2. [number of tab] `shift + .`
3. to decrease the tab: [number of tab] `shift + ,`
#### Copy all line
`gg + V + G`


