return {
	{
		"folke/trouble.nvim",
		cmd = "Trouble",
		opts = { icons = false },
		keys = {
			{ "<leader>tt", "<cmd>Trouble diagnostics toggle<cr>", desc = "Trouble Toggle" },
			{ "<cmd>tè", "<cmd>Trouble next<cr>", desc = "Trouble Next" },
			{ "<cmd>t;", "<cmd>Trouble prev<cr>", desc = "Trouble Previous" },
		},
	},
}
