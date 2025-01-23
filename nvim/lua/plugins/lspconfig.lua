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
      float = {
        focusable = false,
        style = "minimal",
        border = "rounded",
        source = "if_many",
        header = "",
        prefix = "",
      },
    })
  end,
}
