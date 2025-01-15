vim.g.mapleader = " "
vim.g.maplocalleader = "\\"
vim.g.netrw_browse_split = 0
vim.g.netrw_banner = 0
vim.g.netrw_winsize = 25
-- vim.g.netrw_liststyle = 3

-- vim.g.lazyvim_picker = "fzf"
vim.g.lazyvim_cmp = "auto"
vim.g.ai_cmp = true
vim.g.root_spec = { "lsp", { ".git", "lua" }, "cwd" }
vim.g.trouble_lualine = true
vim.g.autoformat = true

vim.g.markdown_recommended_style = 0

-- Set to "basedpyright" to use basedpyright instead of pyright.
vim.g.lazyvim_python_lsp = "basedpyright"
-- Set to "ruff_lsp" to use the old LSP implementation version.
vim.g.lazyvim_python_ruff = "ruff"


local opt = vim.opt

opt.autowrite = true
opt.confirm = true
opt.cursorline = true
opt.grepprg = "rg --vimgrep"
opt.relativenumber = true
opt.number = true
opt.signcolumn = "yes"
opt.smartindent = true
opt.expandtab = true
opt.tabstop = 2
opt.shiftwidth = 2
opt.undolevels = 10000
opt.updatetime = 200
opt.virtualedit = "block"
opt.wrap = false

opt.smoothscroll = true
