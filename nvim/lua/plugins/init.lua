return {
	"nvim-lua/plenary.nvim",

	{ "nvim-treesitter/nvim-treesitter", build = ":TSUpdate" },
	{
		"nvim-telescope/telescope.nvim",
		dependencies = { "nvim-lua/plenary.nvim" },
		cmd = "Telescope",
		keys = {
			{ "<leader>ff", "<cmd>Telescope find_files<cr>", { desc = "Telescope find files" } },
			{ "<leader>fg", "<cmd>Telescope live_grep<cr>", { desc = "Telescope live grep" } },
			{ "<leader>fb", "<cmd>Telescope buffers<cr>", { desc = "Telescope buffers" } },
			{ "<leader>fh", "<cmd>Telescope help_tags<cr>", { desc = "Telescope help tags" } },
		},
	},
	{
		"akinsho/bufferline.nvim",
		event = "VeryLazy",
		version = "*",
		keys = {
			{ "<S-h>", "<cmd>BufferLineCyclePrev<cr>", desc = "Prev Buffer" },
			{ "<S-l>", "<cmd>BufferLineCycleNext<cr>", desc = "Next Buffer" },
		},
		opts = { options = { always_show_bufferline = false } },
		config = function(_, opts)
			vim.opt.termguicolors = true
			require("bufferline").setup(opts)
			vim.api.nvim_create_autocmd({ "BufAdd", "BufDelete" }, {
				callback = function()
					vim.schedule(function()
						pcall(nvim_bufferline)
					end)
				end,
			})
		end,
	},
	{ "echasnovski/mini.surround", recommended = true },
	{
		"nvim-lualine/lualine.nvim",
		event = "VeryLazy",
		config = function()
			require("lualine").setup({ extensions = { "lazy" } })
		end,
	},
	{ "mfussenegger/nvim-lint", event = { "BufReadPost", "BufWritePost", "BufNewFile" } },
}
