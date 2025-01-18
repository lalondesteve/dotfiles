local lang = {
	"bash",
	"c",
	"diff",
	"html",
	"javascript",
	"jsdoc",
	"json",
	"jsonc",
	"lua",
	"luadoc",
	"luap",
	"markdown",
	"markdown_inline",
	"ninja",
	"python",
	"regex",
	"rst",
	"toml",
	"tsx",
	"typescript",
	"vim",
	"vimdoc",
	"vue",
	"xml",
	"yaml",
}

return {
	"nvim-treesitter/nvim-treesitter",
	build = ":TSUpdate",
	cmd = { "TSUpdateSync", "TSUpdate", "TSInstall" },
	opts_extend = { "ensure_installed" },
	opts = {
		highlight = { enabled = true },
		indent = { enabled = true },
		ensure_installed = lang,
	},
	config = function(_, opts)
		require("nvim-treesitter.configs").setup(opts)
	end,
}
