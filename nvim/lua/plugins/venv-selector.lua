if true then
  return {}
end
return {
  "linux-cultist/venv-selector.nvim",
  dependencies = { "neovim/nvim-lspconfig", "nvim-dap-python" },
  opts = {
    name = "venv",
    auto_refresh = true,
  },
  event = "VeryLazy",
  branch = "regexp",
  lazy = false,
  keys = {
    { "<leader>v", group = "VenvSelector", { desc = "VenvSelector" } },
    { "<leader>vs", "<cmd>VenvSelect<cr>", { desc = "Select Virtualenv" } },
    { "<leader>vc", "<cmd>VenvSelectCached<cr>", { desc = "Select Cached Virtualenv" } },
  },
}
