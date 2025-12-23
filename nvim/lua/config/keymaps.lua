local map = vim.keymap.set

-- map("n", "<leader>e", vim.cmd.Ex, { desc = "File Explorer" })
map({ "n", "v" }, "<leader>te", "<cmd>:term<cr>i", { desc = "Open Terminal" })

-- working with lua (from teej_dev)
map("n", "<leader><leader>r", "<cmd>source %<cr>", { desc = "lua run current file (lua)" })
map("n", "<leader>r", ":.lua<cr>", { desc = "lua run current line" })
map("v", "<leader>r", ":lua<cr>", { desc = "lua run current line" })

-- lazy
map("n", "<leader>ll", "<cmd>Lazy<cr>", { desc = "Lazy" })
map("n", "<leader>lx", "<cmd>LazyExtras<cr>", { desc = "LazyExtras" })

-- intend with tab
map("n", "<tab>", ">>")
map("n", "<s-tab>", "<<")
map("v", "<tab>", ">gv")
map("v", "<s-tab>", "<gv")

-- move and zoom
map("n", "<c-m>", "<c-d>zz", { desc = "Page Down" })
map("n", "<c-u>", "<c-u>zz", { desc = "Page Up" })
-- move lines
map({ "n" }, "<c-j>", ":m +1<cr>", { desc = "Move Line Down" })
map({ "n" }, "<c-k>", ":m -2<cr>", { desc = "Move Line UP" })
map({ "v" }, "<c-j>", ":m +1<cr>gv", { desc = "Move Selection Down" })
map({ "v" }, "<c-k>", ":m -2<cr>gv", { desc = "Move Selection UP" })

-- Buffers ( : to leader)
map({ "n", "v" }, "<leader>bn", vim.cmd.bnext, { desc = "Go to Next Buffer" })
map({ "n", "v" }, "<leader>bp", vim.cmd.bprev, { desc = "Go to Previous Buffer" })
map({ "n", "v" }, "<leader>bls", vim.cmd.buffers, { desc = "List All Buffers" })

map({ "n", "v" }, "<leader>t", "<cmd>:term<cr>i", { desc = "Open Terminal" })

-- map({ "n", "v" }, "Ç", "{")
-- map({ "n", "v" }, "ç", "}")

require("config.csm")
