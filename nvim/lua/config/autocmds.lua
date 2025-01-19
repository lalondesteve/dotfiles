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


vim.api.nvim_create_autocmd({ "BufWritePre" }, {
  group = augroup("format_on_write"),
  callback = function()
    vim.lsp.buf.format({ async = false })
  end,
})
