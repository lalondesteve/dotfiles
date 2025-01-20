local map = vim.keymap.set

-- lazy
map("n", "<leader>ll", "<cmd>Lazy<cr>", { desc = "Lazy" })
map("n", "<leader>lx", "<cmd>LazyExtras<cr>", { desc = "LazyExtras" })
-- utils
map("n", "<leader>qq", "<cmd>qa<cr>", { desc = "Quit All" })
map("n", "<leader>qw", "<cmd>wqa<cr>", { desc = "Quit And Save All" })
map("n", "<leader>e", vim.cmd.Ex, { desc = "File Explorer" })
-- move lines
map({ "n", "v", "x" }, "<C-j>", ":m'>+<cr>gv", { desc = "move line/selection down" })
map({ "n", "v", "x" }, "<C-k>", ":m-2<cr>gv", { desc = "move line/selection down" })
-- move and zoom
map("n", "<C-d>", "<C-d>zz", { desc = "Page Down" })
map("n", "<C-u>", "<C-u>zz", { desc = "Page Up" })
-- intend with tab
map("n", "<tab>", ">>")
map("n", "<S-tab>", "<<")
map("v", "<tab>", ">gv")
map("v", "<S-tab>", "<gv")
-- format
map({ "n", "v" }, "<leader>F", "<cmd>lua vim.lsp.buf.format({async=false})<cr>", { desc = "Format Buffer" })
-- windows (ctrl to leader)
map({"n", "v"}, "<leader>ws", "<C-w>s", {desc = "Window Split"})
map({"n", "v"}, "<leader>wv", "<C-w>v", {desc = "Window Vertical Split"})
map({"n", "v"}, "<leader>ww", "<C-w>w", {desc = "Window Switch"})
map({"n", "v"}, "<leader>wq", "<C-w>q", {desc = "Window Close"})
map({"n", "v"}, "<leader>wx", "<C-w>x", {desc = "Exchange/Swap Windows"})
map({"n", "v"}, "<leader>wh", "<C-w>h", {desc = "Move Cursor to Left Window"})
map({"n", "v"}, "<leader>wj", "<C-w>j", {desc = "Move Cursor to Bottom Window"})
map({"n", "v"}, "<leader>wk", "<C-w>k", {desc = "Move Cursor to Top Window"})
map({"n", "v"}, "<leader>wl", "<C-w>l", {desc = "Move Cursor to Rigth Window"})
-- Buffers ( : to leader)
map({"n", "v"}, "<leader>bn", "<cmd>bn<cr>", {desc = "Go to Next Buffer"})
map({"n", "v"}, "<leader>bp", "<cmd>bp<cr>", {desc = "Go to Previous Buffer"})
map({"n", "v"}, "<leader>bd", "<cmd>bd<cr>", {desc = "Delete Buffer"})
map({"n", "v"}, "<leader>bls", "<cmd>buffers<cr>", {desc = "List All Buffers"})

