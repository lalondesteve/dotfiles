local map = vim.keymap.set

-- lazy
map("n", "<leader>ll", "<cmd>Lazy<cr>", { desc = "Lazy" })
map("n", "<leader>lx", "<cmd>LazyExtras<cr>", { desc = "LazyExtras" })
-- utils
map("n", "<leader>qq", "<cmd>qa<cr>", { desc = "Quit All" })
map("n", "<leader>qw", "<cmd>wqa<cr>", { desc = "Quit & Save All" })
map("n", "<leader>e", vim.cmd.Ex, { desc = "File Explorer" })
-- move lines
map({ "n" }, "<C-j>", ":m +1<cr>", { desc = "Move Line Down" })
map({ "n" }, "<c-k>", ":m -2<cr>", { desc = "Move Line UP" })
map({ "x" }, "<C-j>", ":m +1<cr>gv", { desc = "Move Selection Down" })
map({ "x" }, "<c-k>", ":m -2<cr>gv", { desc = "Move Selection UP" })
-- move and zoom
map("n", "<c-d>", "<c-d>zz", { desc = "Page Down" })
map("n", "<c-u>", "<c-u>zz", { desc = "Page Up" })
-- intend with tab
map("n", "<tab>", ">>")
map("n", "<s-tab>", "<<")
map("v", "<tab>", ">gv")
map("v", "<s-tab>", "<gv")
-- windows (ctrl to leader)
map({ "n", "v" }, "<leader>ws", "<C-w>s", { desc = "Window Split" })
map({ "n", "v" }, "<leader>wv", "<C-w>v", { desc = "Window Vertical Split" })
map({ "n", "v" }, "<leader>ww", "<C-w>w", { desc = "Window Switch" })
map({ "n", "v" }, "<leader>wq", "<C-w>q", { desc = "Window Close" })
map({ "n", "v" }, "<leader>wx", "<C-w>x", { desc = "Exchange/Swap Windows" })
map({ "n", "v" }, "<leader>wh", "<C-w>h", { desc = "Move Cursor to Left Window" })
map({ "n", "v" }, "<leader>wj", "<C-w>j", { desc = "Move Cursor to Bottom Window" })
map({ "n", "v" }, "<leader>wk", "<C-w>k", { desc = "Move Cursor to Top Window" })
map({ "n", "v" }, "<leader>wl", "<C-w>l", { desc = "Move Cursor to Rigth Window" })
-- Buffers ( : to leader)
map({ "n", "v" }, "<leader>bn", vim.cmd.bnext, { desc = "Go to Next Buffer" })
map({ "n", "v" }, "<leader>bp", vim.cmd.bprev, { desc = "Go to Previous Buffer" })
map({ "n", "v" }, "<leader>bd", "<cmd>bd<cr>", { desc = "Delete Buffer" })
map({ "n", "v" }, "<leader>bls", vim.cmd.buffers, { desc = "List All Buffers" })
-- format
-- map({ "n", "v" }, "<leader>f", "<cmd>lua vim.lsp.buf.format({async=false})<cr>", { desc = "format buffer" })
map({ "n", "v" }, "<leader>te", "<cmd>:term<cr>i", { desc = "Open Terminal" })
