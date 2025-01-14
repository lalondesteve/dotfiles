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
			{ "<leader><tab>", group = "Tabs" },
			{ "<leader>q", group = "Quit/Session" },
			{ "<leader>f", group = "File/Find" },
			{ "<leader>c", group = "Code" },
			mode = { "n", "v" },
			{
				"<leader>b",
				group = "Buffer",
				expand = function()
					return require("which-key.extras").expand.buf()
				end,
			},
			{
				"<leader>w",
				group = "Windows",
				proxy = "<c-w>",
				expand = function()
					return require("which-key.extras").expand.win()
				end,
			},
		},
	},
}
