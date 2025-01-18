local function cssls_setup(config, capabilities)
	config.cssls.setup({ capabilities = capabilities }, {
		settings = {
			css = { validate = true, lint = { unknownAtRules = "ignore" } },
		},
	})
end

local ruff = {
	cmd_env = { RUFF_TRACE = "messages" },
	init_options = { settings = { logLevel = "error" } },
}
-- local function ruff_setup(config, capabilities)
-- 	config.ruff.setup(capabilities, {
-- 		on_attach = function(client, _)
-- 			local venv = vim.fn.system({ "$(uv python find)" })
-- 			client.interpreter = venv
-- 			client.notify(vim.lsp.workspace_didChangeConfiguration, { settings = client.config.settings })
-- 			vim.echo("Hello")
-- 		end,
-- 		--
-- 	})
-- end

local function pyright_setup(config, capabilities)
	config.pyright.setup(capabilities, {
		settings = {
			pyright = {
				disableOrganizeImports = true,
				disableTaggedHints = true,
			},
			python = {
				analysis = {
					autoImportCompletion = true,
					autoSearchPaths = true,
					diagnosticMode = "off",
					typeCheckingMode = "standard",
				},
			},
		},
	})
end

return {
	"neovim/nvim-lspconfig",
	event = { "BufReadPost", "BufWritePost", "BufNewFile" },
	lazy = true,
	dependencies = {
		"mason.nvim",
		"williamboman/mason-lspconfig.nvim",
		"hrsh7th/cmp-nvim-lsp",
		"hrsh7th/cmp-buffer",
		"hrsh7th/cmp-path",
		"hrsh7th/cmp-cmdline",
		"hrsh7th/nvim-cmp",
		"L3MON4D3/LuaSnip",
		"saadparwaiz1/cmp_luasnip",
		"j-hui/fidget.nvim",
	},
	opts = { servers = { ruff = ruff } },
	config = function()
		local cmp_lsp = require("cmp_nvim_lsp")
		local capabilities = vim.tbl_deep_extend(
			"force",
			{},
			vim.lsp.protocol.make_client_capabilities(),
			cmp_lsp.default_capabilities()
		)
		local lspconfig = require("lspconfig")

		local handlers = {
			function(server_name)
				lspconfig[server_name].setup({ capabilities = capabilities })
			end,
			["cssls"] = cssls_setup(lspconfig, capabilities),
			["pyright"] = pyright_setup(lspconfig, capabilities),
			-- ["ruff"] = ruff_setup(lspconfig, capabilities),
		}

		require("fidget").setup({})
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
	end,
}
