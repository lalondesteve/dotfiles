return {
    { "goolord/alpha-nvim", enable = false },
    -- { "echasnovski/mini.pairs", enabled = false },
    -- { "folke/noice.nvim", enabled = false },
    { "nvim-neo-tree/neo-tree.nvim", enabled = false },
    { "saghen/blink.cmp", enabled = false },
    -- Need to choose between blink or nvim-cmp
    -- {
    --     "hrsh7th/nvim-cmp",
    --     enabled = true,
    --     dependencies = {
    --         "Jezda1337/nvim-html-css", -- add it as dependencies of `nvim-cmp` or standalone plugin
    --     },
    -- },
    {
        "folke/snacks.nvim",
        opts = {
            dashboard = { enabled = false },
        },
    },
}
