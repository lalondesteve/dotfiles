  return {

	"folke/tokyonight.nvim",
  priority = 1000,
  lazy = false, 
	opts = {
		style = "night",
		on_colors = function(colors)
			colors.green1 = "#40d69b"
			colors.green2 = "#ff0000"
			colors.yellow = "#efef7f"
			colors.magenta = "#eb75ce"
			-- colors.magenta = "#ff0000"
			colors.cyan = "#00afff"
		end,
	},
  config = function (_, opts) require("tokyonight").setup(opts);vim.cmd([[colorscheme tokyonight]]) end,

  }
