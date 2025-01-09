if true then
    return {}
end
return {
    require("tokyonight").setup({
        style = "night",
        on_colors = function(colors)
            colors.orange = "#FF9640"
            colors.magenta = "#eb75ce"
            -- colors.magenta = "#eb66ca"
            -- colors.magenta = "#ff5fd7"
            colors.magenta2 = "#bb9af7"
            -- colors.info = "#33ccff"
            colors.cyan = "#00afff"
            colors.teal = "#20d6d2"
            -- colors.yellow = "#efef7f"
            colors.yellow = "#efdf60"
            colors.green1 = "#40d69b"
            -- colors.green1 = "#22d6b6"
            colors.git = {
                add = "#449dab",
                change = "#6183bb",
                delete = "#914c54",
            }
        end,
        on_highlights = function(highlights, colors) end,
    }),
}
