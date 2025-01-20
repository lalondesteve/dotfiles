local function augroup(name)
  return vim.api.nvim_create_augroup("lal_" .. name, { clear = true })
end
-- Highlight on yank
vim.api.nvim_create_autocmd("TextYankPost", {
  group = augroup("highlight_yank"),
  callback = function()
    (vim.hl or vim.highlight).on_yank()
  end,
})


vim.api.nvim_create_autocmd("LspAttach", {
  group = augroup("lsp_attach"),
  callback = function(event)
    vim.keymap.set("n", "gd", "<cmd>Telescope lsp_definitions<cr>", { desc = "Go to Definitions" })
    vim.keymap.set("n", "gr", "<cmd>Telescope lsp_references<cr>", { desc = "Go to References" })
    vim.keymap.set("n", "gI", "<cmd>Telescope lsp_implementations<cr>", { desc = "Go to Implementations" })
    vim.keymap.set("n", "gD", "<cmd>Telescope lsp_type_definitions<cr>", { desc = "Go to Type Definition" })
    vim.keymap.set("n", "<leader>ca", vim.lsp.buf.code_action, { desc = "Code Actions" })
    vim.api.nvim_create_autocmd({ "BufWritePre" }, {
      group = augroup("lsp_write"),
      callback = function()
        vim.lsp.buf.format({ async = false })
      end,
    })
  end
})
