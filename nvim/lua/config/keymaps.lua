-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
vim.keymap.set("n", "<leader>e", vim.cmd.Ex)
vim.cmd("nnoremap <C-d> <C-d> zz")
vim.cmd("nnoremap <C-u> <C-u> zz")
vim.cmd("nnoremap <C-n> :m+1<CR>")
vim.cmd("nnoremap <C-p> :m-2<CR>")
