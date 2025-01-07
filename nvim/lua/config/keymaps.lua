-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
vim.keymap.set("n", "<leader>e", vim.cmd.Ex)
vim.keymap.set("v", "<tab>", ">")
vim.keymap.set("n", "<S-tab>", "<<")
vim.keymap.set("n", "<tab>", ">>")
vim.keymap.set("v", "<S-tab>", "<")
vim.keymap.set("n", "<C-k>", ":m+1<CR>")
vim.keymap.set("n", "<C-j>", ":m-2<CR>")
vim.cmd("nnoremap <C-d> <C-d> zz")
vim.cmd("nnoremap <C-u> <C-u> zz")
