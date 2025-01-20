
-- local servers = require('config.servers')

return {
"neovim/nvim-lspconfig",
dependencies = {
"williamboman/mason.nvim",
{"williamboman/mason-lspconfig.nvim", config = function() end },
},
config = function()
  
  local lspconfig = require("lspconfig")

  require("mason").setup({auto_install = true})
  require("mason-lspconfig").setup()
  
end


}
