return {
  "echasnovski/mini.nvim",
  version = "*",
  {
    "echasnovski/mini.files",
    opts = {
      width_preview = 60,
    },
    options = {
      use_as_default_explorer = true,
    },
    mappings = {
      go_in_plus = "<cr>",
    },
  },
  keys = {
    {
      "<leader>e",
      function()
        require("mini.files").open(vim.uv.cwd(), true)
      end,
      desc = "Explorer (mini.files)",
    },
    { "<leader>fm", false },
    { "<leader>fM", false },
  },
}
