if true then
  return {}
end
return {
  "neovim/nvim-lspconfig",
  opts = {
    servers = {
      pyright = {
        settings = {
          pyright = {
            disableOrganizeImport = true,
            disableTaggedHints = true,
          },
          python = {
            analysis = {
              autoImportsCompletion = true,
              autoSearchPaths = true,
              diagnosticMode = "workspace",
              useLibraryCodeForTypes = true,
              typeCheckingMode = "standard",
            },
          },
        },
      },
    },
  },
}
