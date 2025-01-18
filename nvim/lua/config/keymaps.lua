local map = vim.keymap.set

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

-- buffers : LazyVim
map("n", "<S-h>", "<cmd>bprevious<cr>", { desc = "Prev Buffer" })
map("n", "<S-l>", "<cmd>bnext<cr>", { desc = "Next Buffer" })
map("n", "<leader>bp", "<cmd>bprevious<cr>", { desc = "Prev Buffer" })
map("n", "<leader>bn", "<cmd>bnext<cr>", { desc = "Next Buffer" })
map("n", "<leader>bb", "<cmd>e #<cr>", { desc = "Switch to Other Buffer" })
map("n", "<leader>bd", "<cmd>bd<cr>", { desc = "Delete Buffer" })
-- map("n", "<leader>bd", function()
-- Snacks.bufdelete()
-- end, { desc = "Delete Buffer" })
-- map("n", "<leader>bo", function()
--         Snacks.bufdelete.other()
-- end, { desc = "Delete Other Buffers" })
map("n", "<leader>bD", "<cmd>:bd<cr>", { desc = "Delete Buffer and Window" })

-- windows
map("n", "<leader>w", "<C-w>", { desc = "Windows", remap = true })
map("n", "<leader>;", "<C-w>s", { desc = "Window Horizontal Split", remap = true })
map("n", "<leader>è", "<C-w>v", { desc = "Window Vertical Split", remap = true })
map("n", "<leader>wd", "<C-w>c", { desc = "Delete Window", remap = true })

-- lazy
map("n", "<leader>ll", "<cmd>Lazy<cr>", { desc = "Lazy" })
map("n", "<leader>lx", "<cmd>LazyExtras<cr>", { desc = "LazyExtras" })
--
