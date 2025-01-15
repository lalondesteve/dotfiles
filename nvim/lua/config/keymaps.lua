local map = vim.keymap.set 

map("n", "<leader>qq", "<cmd>qa<cr>", { desc = "Quit All" })
map("n", "<leader>e", vim.cmd.Ex, { desc = "File Explorer"})
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

-- buffers (from LazyVim)
map("n", "<S-h>", "<cmd>bprevious<cr>", { desc = "Prev Buffer" })
map("n", "<S-l>", "<cmd>bnext<cr>", { desc = "Next Buffer" })
map("n", "<leader>bb", "<cmd>e #<cr>", { desc = "Switch to Other Buffer" })
map("n", "<leader>bd", function()
  Snacks.bufdelete()
end, { desc = "Delete Buffer" })
map("n", "<leader>bo", function()
  Snacks.bufdelete.other()
end, { desc = "Delete Other Buffers" })
map("n", "<leader>bD", "<cmd>:bd<cr>", { desc = "Delete Buffer and Window" })

-- windows
map("n", "<leader>w", "<C-w>", { desc = "Windows", remap = true })
map("n", "<leader>;", "<C-w>s", { desc = "Window Horizontal Split", remap = true })
map("n", "<leader>è", "<C-w>v", { desc = "Window Vertical Split", remap = true })
map("n", "<leader>wd", "<C-w>c", { desc = "Delete Window", remap = true })
map("n", "<leader>wm", function() Snacks.toggle.zoom() end, { desc= "Maximize Window"})
-- Move to window using the <ctrl> hjkl keys (from LazyVim)
map("n", "<C-h>", "<C-w>h", { desc = "Go to Left Window", remap = true })
map("n", "<C-j>", "<C-w>j", { desc = "Go to Lower Window", remap = true })
map("n", "<C-k>", "<C-w>k", { desc = "Go to Upper Window", remap = true })
map("n", "<C-l>", "<C-w>l", { desc = "Go to Right Window", remap = true })

-- tabs
map("n", "<leader><tab>l", "<cmd>tablast<cr>", { desc = "Last Tab" })
map("n", "<leader><tab>f", "<cmd>tabfirst<cr>", { desc = "First Tab" })
map("n", "<leader><tab><tab>", "<cmd>tabnew<cr>", { desc = "New Tab" })
map("n", "<leader><tab>è", "<cmd>tabnext<cr>", { desc = "Next Tab" })
map("n", "<leader><tab>x", "<cmd>tabclose<cr>", { desc = "Close Tab" })
map("n", "<leader><tab>;", "<cmd>tabprevious<cr>", { desc = "Previous Tab" })


map({ "i", "n", "s" }, "<esc>", function()
  vim.cmd("noh")
  return "<esc>"
end, { expr = true, desc = "Escape and Clear hlsearch" })


-- https://github.com/mhinz/vim-galore#saner-behavior-of-n-and-n
map("n", "n", "'Nn'[v:searchforward].'zv'", { expr = true, desc = "Next Search Result" })
map("x", "n", "'Nn'[v:searchforward]", { expr = true, desc = "Next Search Result" })
map("o", "n", "'Nn'[v:searchforward]", { expr = true, desc = "Next Search Result" })
map("n", "N", "'nN'[v:searchforward].'zv'", { expr = true, desc = "Prev Search Result" })
map("x", "N", "'nN'[v:searchforward]", { expr = true, desc = "Prev Search Result" })
map("o", "N", "'nN'[v:searchforward]", { expr = true, desc = "Prev Search Result" })

-- lazy
map("n", "<leader>ll", "<cmd>Lazy<cr>", { desc = "Lazy" })
map("n", "<leader>lx", "<cmd>LazyExtras<cr>", { desc = "LazyExtras" })

-- LSP
map("n", "K", vim.lsp.buf.hover, {})
map("n", "<leader>cd", vim.lsp.buf.definition, {desc = "Code Definition"})
map("n", "<leader>cr", vim.lsp.buf.references, {desc = "Code References"})
map("n", "<leader>ca", vim.lsp.buf.code_action, {desc = "Code Action"})

