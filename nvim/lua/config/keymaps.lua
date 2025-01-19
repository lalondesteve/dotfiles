
local map = vim.keymap.set

-- lazy
map("n", "<leader>ll", "<cmd>Lazy<cr>", { desc = "Lazy" })
map("n", "<leader>lx", "<cmd>LazyExtras<cr>", { desc = "LazyExtras" })

map("n", "<leader>qq", "<cmd>qa<cr>", { desc = "Quit All" })
map("n", "<leader>e", vim.cmd.Ex, { desc = "File Explorer" })
-- move lines
map({ "n", "v", "x" }, "<C-j>", ":m'>+<cr>gv")
map({ "n", "v", "x" }, "<C-k>", ":m-2<cr>gv")
-- move and zoom
map("n", "<C-d>", "<C-d>zz", { desc = "Page Down" })
map("n", "<C-u>", "<C-u>zz", { desc = "Page Up" })

-- intend with tab
map("n", "<tab>", ">>")
map("n", "<S-tab>", "<<")
map("v", "<tab>", ">gv")
map("v", "<S-tab>", "<gv")

map({"n", "v"}, "<leader>F", "<cmd>lua vim.lsp.buf.format({async=false})<cr>")
