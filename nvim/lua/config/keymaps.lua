local map = vim.keymap.set 

map("n", "<leader>qq", "<cmd>qa<cr>", { desc = "Quit All" })
map("n", "<leader>e", vim.cmd.Ex)
-- move lines
map({"n", "v", "x"}, "<C-j>", ":m'>+<cr>gv")
map({"n", "v", "x"}, "<C-k>", ":m-2<cr>gv")
-- move and zoom
vim.cmd("nnoremap <C-d> <C-d> zz")
vim.cmd("nnoremap <C-n> <C-n> zz")
-- intend with tab
map("n", "<tab>", ">>")
map("n", "<S-tab>", "<<")
map("v", "<tab>", ">gv")
map("v", "<S-tab>", "<gv")

-- formatting
-- map({ "n", "v" }, "<leader>cf", function()
-- 	LazyVim.format({force=true})
-- end, {desc="Format"})

