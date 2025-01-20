vim.g.mapleader = " "
vim.g.localleader = "é"

-- netrw
vim.g.netrw_browse_split = 0
vim.g.netrw_banner = 0
vim.g.netrw_winsize = 25

vim.g.clipboard = vim.env.SSH_TTY and "" or "unnamedplus"

-- tabs vs spaces
vim.o.expandtab = true
vim.o.shiftwidth = 2
vim.o.softtabstop = 2
vim.o.tabstop = 2

-- otherstuff
vim.o.autowrite = true
vim.o.confirm = true
vim.o.cursorline = false
vim.o.grepprg = "rg --vimgrep"
vim.o.number = true
vim.o.relativenumber = true
vim.o.scrolloff = 8
vim.o.sidescrolloff = 8
vim.o.showmode = false
vim.o.smartindent = true
vim.o.smartcase = true
vim.o.smoothscroll = true
vim.o.timeoutlen = 1000
vim.o.undolevels = 10000
vim.o.updatetime = 200
vim.o.wrap = false
