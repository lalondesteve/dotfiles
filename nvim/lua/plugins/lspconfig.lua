return {
  "neovim/nvim-lspconfig",
  dependencies = {
    "williamboman/mason.nvim",
    "williamboman/mason-lspconfig.nvim",
    "folke/lazydev.nvim",
    "saghen/blink.cmp"
  },
  opts = {
    -- inlay_hints = { enabled = true },
    servers = {
      cssls = {
        settings = {
          css = { validate = true, lint = { unknownAtRules = "ignore" } },
        },
      },
      ruff = {
        cmd = { "uv", "run", "ruff", "server" },
        cmd_env = { RUFF_TRACE = "messages" },
        init_options = { settings = { logLevel = "error" } },
        on_attach = function(client, _)
          client.server_capabilities.hoverProvider = false
        end
      },
      -- ts_ls = {
      --   init_options = {
      --     plugins = {
      --       {
      --         name = '@vue/typescript-plugin',
      --         location = vim.fn.stdpath('data') ..
      --             '/mason/packages/vue-language-server/node_modules/@vue/language-server/node_modules/@vue/typescript-plugin',
      --         languages = { 'vue' }
      --       }
      --     }
      --   },
      --
      --   filetypes = { 'typescript', 'javascript', 'javascriptreact', 'typescriptreact', 'vue' },
      -- },
      -- volar = {
      --   --   filetypes = { 'typescript', 'javascript', 'vue' },
      --   opts = {
      --     vue = {
      --       hybridMode = true,
      --     }
      --   },
      -- },
      -- vtsls = {},
      --   settings = {
      --     typescript = {
      --       inlayHints = {
      --         enumMemberValues = {
      --           enabled = true
      --         },
      --         functionLikeReturnTypes = {
      --           enabled = true
      --         },
      --         propertyDeclarationTypes = {
      --           enabled = true
      --         },
      --         parameterTypes = {
      --           enabled = true,
      --           suppressWhenArgumentMatchesName = true
      --         },
      --         variableTypes = {
      --           enabled = true
      --         }
      --       }
      --     }
      --   }
      -- },
      -- ts_ls = {
      --   filetypes = { 'typescript', 'javascript', 'vue' },
      --   opts = {
      --     plugins = {
      --       {
      --         name = "@vue/typescript-plugin",
      --         location = vim.fn.stdpath 'data' ..
      --             "/mason/packages/vue-language-server/node_modules/@vue/language-server/",
      --         languages = { "vue" },
      --       }
      --     }
      --   },
      --   settings = {
      --     typescript = {
      --       tsserver = {
      --         useSyntaxServer = false,
      --       },
      --       inlayHints = {
      --         includeInlayParameterNameHints = 'all',
      --         includeInlayParameterNameHintsWhenArgumentMatchesName = true,
      --         includeInlayFunctionParameterTypeHints = true,
      --         includeInlayVariableTypeHints = true,
      --         includeInlayVariableTypeHintsWhenTypeMatchesName = true,
      --         includeInlayPropertyDeclarationTypeHints = true,
      --         includeInlayFunctionLikeReturnTypeHints = true,
      --         includeInlayEnumMemberValueHints = true,
      --       },
      --     },
      --   },
      -- },
      pyright = {
        settings = {
          pyright = {
            disableOrganizeImports = true,
            disableTaggedHints = true,
          },
          python = {
            analysis = {
              autoImportCompletion = true,
              autoSearchPaths = true,
              diagnosticMode = "workspace",
              useLibraryCodeForTypes = true,
              typeCheckingMode = "standard",
            },
          },
        },
      },
    }
  },
  config = function(_, opts)
    local lspconfig = require("lspconfig")

    local handlers = { function(server_name)
      local config = opts.servers[server_name] or {}
      config.capabilities = require("blink.cmp").get_lsp_capabilities(config.capabilities)
      lspconfig[server_name].setup(config)
    end }

    -- lspconfig['ts_ls'].setup({})

    require("mason-lspconfig").setup({ handlers = handlers, automatic_installation = true, ensure_installed = {} })

    vim.api.nvim_create_autocmd('LspAttach', {
      callback = function(args)
        local c = vim.lsp.get_client_by_id(args.data.client_id)
        vim.keymap.set(
          { "n", "v" },
          "<leader>f",
          "<cmd>lua vim.lsp.buf.format({async=false})<cr>",
          { desc = "format buffer" }
        )

        if not c then return end
        vim.api.nvim_create_autocmd('BufWritePre', {
          buffer = args.buf,
          callback = function()
            vim.lsp.buf.format({ bufnr = args.buf, id = c.id })
          end

        })
      end
    })

    vim.diagnostic.config({
      virtual_text = { source = true, },
      signs = true,
      float = {
        focusable = false,
        style = "minimal",
        border = "rounded",
        source = true,
        header = "",
        prefix = "",
      },
    })
  end,
}
