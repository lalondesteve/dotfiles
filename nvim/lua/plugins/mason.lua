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
  "ruff",
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
      -- ensure_installed = servers,
      -- auto_install = true,
    },
    -- config = true,
  },
}
