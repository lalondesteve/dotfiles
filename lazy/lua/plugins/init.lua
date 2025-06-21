return {
  {
    "j-hui/fidget.nvim",
    priority = 10,
    lazy = false,
    opts = { display = { done_ttl = 5 }, notification = { override_vim_notify = true } },
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
}
