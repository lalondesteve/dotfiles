return {
  "folke/tokyonight.nvim",
  priority = 1000,
  lazy = false,
  opts = {
    style = "night",
    on_colors = function(colors)
      colors.green1 = "#40d69b"
      colors.yellow = "#efef7f"
      colors.magenta = "#eb75ce"
      colors.cyan = "#00afff"
    end,
  },
  init = function()
    vim.cmd.colorscheme("tokyonight")
  end,
}
