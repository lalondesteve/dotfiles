return {
    {
        "folke/tokyonight.nvim",
        lazy = true,
        opts = {
            style = "storm",
            on_colors = function(colors)
                colors.green1 = "#40d69b"
                colors.green2 = "#ff0000"
                colors.yellow = "#efef7f"
                colors.magenta = "#eb75ce"
                colors.cyan = "#00afff"
            end,
        },
    },
}
