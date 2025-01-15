return {
	"folke/which-key.nvim",
	event = "VeryLazy",
	opts = {
		preset = "helix",
		delay = 100,
		icons = { mappings = false },
		spec = {
			{ "<leader>l", desc = "Lazy" },
			{ "<leader>t", desc = "Trouble" },
			{ "<leader>e", desc = "File Explorer" },
			{ "<leader><tab>", group = "tabs" },
			{ "<leader>q", group = "quit/session" },
			{ "<leader>f", group = "file/find" },
			{ "<leader>c", group = "code" },
			mode = { "n", "v" },
			{
				"<leader>b",
				group = "buffer",
				expand = function()
					return require("which-key.extras").expand.buf()
				end,
			},
			{
				"<leader>w",
				group = "windows",
				proxy = "<c-w>",
				expand = function()
					return require("which-key.extras").expand.win()
				end,
			},
		},
	},
}
