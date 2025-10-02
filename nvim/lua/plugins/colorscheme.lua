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
      colors.bg = "#1e1c2b"
      colors.bg_dark1 = "#1b1e2d"
    end,
  },
  init = function()
    vim.cmd.colorscheme("tokyonight")
  end,
}
