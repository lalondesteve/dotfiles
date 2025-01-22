return {
  "folke/which-key.nvim",
  event = "VeryLazy",
  opts = {
    preset = "helix",
    defaults = {},
    delay = 100,
    icons = { mappings = false },
    spec = {
      { "<leader>/", group = "Find in buffer" },
      { "<leader>c", group = "Code" },
      { "<leader>e", desc = "File Explorer" },
      { "<leader>l", desc = "Lazy" },
      -- { "<leader><tab>", group = "Tabs" },
      { "<leader>n", group = "Notifications" },
      { "<leader>q", group = "Quit/Session" },
      { "<leader>s", group = "Search (Telescope)" },
      -- { "<leader>t", desc = "Trouble" },
      { "<leader>v", desc = "Venv Select" },
      mode = { "n", "v" },
      {
        "<leader>b",
        group = "Buffer",
        expand = function()
          return require("which-key.extras").expand.buf()
        end,
      },
      {
        "<leader>w",
        group = "Windows",
        proxy = "<c-w>",
        expand = function()
          return require("which-key.extras").expand.win()
        end,
      },
    },
    triggers = {
      { "<leader>", mode = { "n", "v" } },
    },
  },
}
