local servers = {
  "css-lsp",
  "docker-compose-language-service",
  "dockerfile-language-server",
  -- "emmet-ls",
  "eslint-lsp",
  "flake8",
  "html-lsp",
  "htmx-lsp",
  "jinja-lsp",
  "json-lsp",
  "lua-language-server",
  "markdown-toc",
  "markdownlint-cli2",
  "marksman",
  "prettier",
  "pyright",
  -- "basedpyright",
  -- "ruff",
  -- "rust-analyzer",
  "shfmt",
  "stylua",
  "tailwindcss-language-server",
  "taplo",
  "vtsls",
  "vue-language-server",
  "yaml-language-server",
}

return {
  {
    "williamboman/mason.nvim",
    cmd = "Mason",
    build = ":MasonUpdate",
    opts_extend = { "ensure_installed" },
    lazy = false,
    opts = {
      ensure_installed = servers,
    },
    init = function()
      local mr = require("mason-registry")
      mr.refresh(function()
        for _, tool in pairs(servers) do
          local p = mr.get_package(tool)
          if not p:is_installed() then
            p:install()
          end
        end
      end)
    end,
  },
  {
    "williamboman/mason-lspconfig.nvim",
    lazy = false,
    opts = {
      auto_install = true,
    },
    config = true,
  },
  {
    "neovim/nvim-lspconfig",
    lazy = false,
    dependencies = {
      "williamboman/mason.nvim",
      "j-hui/fidget.nvim",
      "williamboman/mason.nvim",
      "saghen/blink.cmp"
    },
    config = function()
      local capabilities = vim.tbl_deep_extend(
        "force",
        {},
        -- vim.lsp.protocol.make_client_capabilities(),
        {},
        require("blink.cmp").get_lsp_capabilities()
      -- require("cmp_nvim_lsp").default_capabilities()
      )
      local lspconfig = require("lspconfig")
      local handlers = {
        function(server_name)
          lspconfig[server_name].setup({ capabilities = capabilities })
        end,
        ["cssls"] = lspconfig.cssls.setup({ capabilities = capabilities }, {
          settings = {
            css = { validate = true, lint = { unknownAtRules = "ignore" } },
          },
        }),
        -- ["ruff"] = lspconfig.ruff.setup({ capabilities = capabilities, cmd_env = { RUFF_TRACE = "messages" }, init_options = { settings = { logLevel = "error" } } }),

        -- ["pyright"] = lspconfig.pyright.setup(capabilities, {
        --   settings = {
        --     pyright = {
        --       -- disableOrganizeImports = true,
        --       -- disableTaggedHints = true,
        --     },
        --     python = {
        --       analysis = {
        --         autoImportCompletion = true,
        --         autoSearchPaths = true,
        --         diagnosticMode = "workspace",
        --         useLibraryCodeForTypes = true,
        --         typeCheckingMode = "standard",
        --       },
        --     },
        --   },
        -- }),
      }
      require("mason-lspconfig").setup({ handlers = handlers })
      vim.diagnostic.config({

        float = {
          focusable = false,
          style = "minimal",
          border = "rounded",
          source = "if_many",
          header = "",
          prefix = "",
        },
      })
    end
  }
}
