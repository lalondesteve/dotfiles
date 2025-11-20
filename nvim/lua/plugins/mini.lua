return {
  {
    "nvim-mini/mini.nvim",
    version = "*",
    {
      "nvim-mini/mini.snippets",
      version = false,
      opts = function(_, opts)
        table.insert(opts.snippets, {
          require("mini.snippets").gen_loader.from_lang(opts),
          require("mini.snippets").gen_loader.from_file("~/.config/nvim/lua/snippets/go.json", nil),
        })
      end,
    },
    {

      "nvim-mini/mini.files",
      lazy = false,
      opts = {
        windows = {
          width_preview = 60,
          width_focus = 60,
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
    },
  },
}
