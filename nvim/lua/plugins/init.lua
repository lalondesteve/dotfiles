return {
  "nvim-lua/plenary.nvim",
  -- {
  --   "stevearc/conform.nvim",
  --   dependencies = { "mason.nvim" },
  --   lazy = true,
  --   cmd = "ConformInfo",
  --   opts = {
  --     default_format_opts = { async = false, quiet = false, lsp_format = "fallback" }
  --   }
  -- },
  {
    "j-hui/fidget.nvim",
    opts = { notification = { override_vim_notify = true } },
    keys = {
      {
        "<leader>nn",
        "<cmd>Fidget history<cr>",
        desc = "Notification History",
      },
      {
        "<leader>nd",
        "<cmd>Fidget clear_history<cr>",
        desc = "Dismiss All Notifications",
      },
    },
  },
  {
    "nvim-treesitter/nvim-treesitter",
    -- enabled = false,
    main = "nvim-treesitter.configs",
    build = ":TSUpdate",
    branch = "master",
    opts = {
      auto_install = true,
      indent = { enable = true },
      highlight = { enable = true },
      ensure_installed = "all",
    },
  },
  {
    "folke/snacks.nvim",
    opts = {
      dashboard = { enabled = false },
      indent = { enabled = true },
      input = { enabled = true },
      notifier = { enabled = false },
      scope = { enabled = true },
      scroll = { enabled = true },
      statuscolumn = { enabled = true },
      words = { enabled = true },
      bigfile = { enabled = true },
      quickfile = { enabled = true },
    }
  },
  { 'folke/todo-comments.nvim', event = 'VimEnter', dependencies = { 'nvim-lua/plenary.nvim' }, opts = { signs = false } },

}
