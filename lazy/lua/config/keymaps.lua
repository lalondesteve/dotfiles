local map = vim.keymap.set

map("n", "<leader>e", vim.cmd.Ex, { desc = "File Explorer" })
map({ "n", "v" }, "<leader>te", "<cmd>:term<cr>i", { desc = "Open Terminal" })

-- lazy
map("n", "<leader>ll", "<cmd>Lazy<cr>", { desc = "Lazy" })
map("n", "<leader>lx", "<cmd>LazyExtras<cr>", { desc = "LazyExtras" })

-- intend with tab
map("n", "<tab>", ">>")
map("n", "<s-tab>", "<<")
map("v", "<tab>", ">gv")
map("v", "<s-tab>", "<gv")

-- move and zoom
map("n", "<c-d>", "<c-d>zz", { desc = "Page Down" })
map("n", "<c-u>", "<c-u>zz", { desc = "Page Up" })
-- move lines
map({ "n" }, "<C-j>", ":m +1<cr>", { desc = "Move Line Down" })
map({ "n" }, "<c-k>", ":m -2<cr>", { desc = "Move Line UP" })
map({ "x" }, "<C-j>", ":m +1<cr>gv", { desc = "Move Selection Down" })
map({ "x" }, "<c-k>", ":m -2<cr>gv", { desc = "Move Selection UP" })
