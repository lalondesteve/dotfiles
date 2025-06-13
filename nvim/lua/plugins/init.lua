return {
  "nvim-lua/plenary.nvim",
  {
    "j-hui/fidget.nvim",
    priority = 10,
    lazy = false,
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
    'nvim-treesitter/nvim-treesitter',
    build = ':TSUpdate',
    -- enabled = false,
    -- main = "nvim-treesitter.configs",
    lazy = false,
    opts = {
      ensure_installed = { 'bash', 'c', 'diff', 'html', 'javascript', 'lua', 'luadoc', 'markdown', 'markdown_inline', 'python', 'query', 'vim', 'vimdoc' },
      auto_install = true,
      highlight = {
        enable = true,
      },
      indent = { enable = true },
    },
  },
  { "mfussenegger/nvim-lint", event = { "BufReadPost", "BufWritePost", "BufNewFile" } },
}
