vim.g.mapleader = " "
vim.g.maplocalleader = "è"

vim.g.netrw_browse_split = 0
vim.g.netrw_banner = 0
vim.g.netrw_winsize = 25

vim.g.autoformat = true
vim.g.lazyvim_cmp = "auto"

vim.o.autowrite = true
vim.o.clipboard = vim.env.SSH_TTY and "" or "unnamedplus"
vim.o.confirm = true
vim.o.cursorline = false
vim.o.expandtab = true
vim.o.grepprg = "rg --vimgrep"
vim.o.completeopt = "menu,menuone,noselect"
vim.o.number = true
vim.o.relativenumber = true
vim.o.scrolloff = 8
vim.o.sidescrolloff = 8
vim.o.shiftwidth = 2
vim.o.showmode = false
vim.o.smartindent = true
vim.o.smartcase = true
vim.o.smoothscroll = true
vim.o.softtabstop = 2
vim.o.tabstop = 2
vim.o.timeoutlen = 1000
vim.o.termguicolors = true
vim.o.undolevels = 10000
vim.o.updatetime = 200
vim.o.wildmode = "longest:full,full"
vim.o.wildoptions = "pum,fuzzy"
vim.o.wrap = false
