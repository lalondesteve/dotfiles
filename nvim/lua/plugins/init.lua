return {
  "nvim-lua/plenary.nvim",
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
    config = function(_, opts)
      require("fidget").setup(opts)
    end
  },
  {
    "nvim-treesitter/nvim-treesitter",
    build = ":TSUpdate",
    branch = "main",
    lazy = false,
    opts = { auto_install = true, highlight = { enable = true } }
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
