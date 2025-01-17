if true then
	return {}
end
return {
	"linux-cultist/venv-selector.nvim",
	dependencies = { "neovim/nvim-lspconfig", "nvim-telescope/telescope.nvim", "mfussenegger/nvim-dap-python" },
	opts = { name = ".venv" },
	event = "VeryLazy",
	keys = { { "<leader>vs", "<cmd>VenvSelect<cr>" } },
}
