return {
  { "nvim-neo-tree/neo-tree.nvim", enabled = false },
  {
    "folke/snacks.nvim",
    priority = 1000,
    lazy = false,
    ---@type snacks.Config
    opts = {
      dashboard = { enabled = false },
      explorer = { enabled = false },
      notifier = { enabled = false },

      -- Default values --
      -- picker = { enabled = true },
      -- indent = { enabled = true },
      -- input = { enabled = true },
      -- scope = { enabled = true },
      -- scroll = { enabled = true },
      -- statuscolumn = { enabled = true },
      -- words = { enabled = true },
      -- bigfile = { enabled = true },
      -- quickfile = { enabled = true },
    },
    keys = {
      { "<leader>e", false },
      { "<leader>E", false },
      { "<leader>fe", false },
      { "<leader>FE", false },
    },
  },
}
