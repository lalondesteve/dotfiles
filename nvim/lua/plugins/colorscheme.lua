return {
        "folke/tokyonight.nvim",
        priority=1000, 
  lazy=false,
        config = function()
                require("tokyonight").setup({
                    style = "night",
                    on_colors = function(colors)
                        colors.green1 = "#40d69b"
                        colors.green2 = "#ff0000"
                        colors.yellow = "#efef7f"
                        colors.magenta = "#eb75ce"
                        -- colors.magenta = "#ff0000"
                        colors.cyan = "#00afff"
                    end,
                })
                vim.cmd.colorscheme("tokyonight")
        end
}
