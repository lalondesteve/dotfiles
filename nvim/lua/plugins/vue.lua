return {
  {
    "nvim-treesitter/nvim-treesitter",
    lazy = true,
    opts = function(_, opts)
      table.insert(opts.ensure_installed, { "vue", "css" })
    end
  },
  {
    "williamboman/mason.nvim",
    lazy = true,
    opts = { ensure_installed = "vue-language-server" }
  },

  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        volar = {
          init_options = {
            vue = {
              hybridMode = true,
            },
          },
        },
        vtsls = {},
      },
    },
  },
  {
    "neovim/nvim-lspconfig",
    opts = function(_, opts)
      table.insert(opts.servers.vtsls.filetypes, "vue")
      opts.plugins = {
        name = "@vue/typescript-plugin",
        location = vim.fn.stdpath("data") .. "/mason/packages/vue-language-server/node_modules/@vue/language-server/",
        languages = { "vue" },
        configNamespace = "typescript",
        enableForWorkspaceTypeScriptVersions = true,
      }
    end,
  },
}
