return {
    { "goolord/alpha-nvim", enable = false },
    { "echasnovski/mini.pairs", enabled = false },
    { "folke/noice.nvim", enabled = false },
    { "nvim-neo-tree/neo-tree.nvim", enabled = false },
    { "saghen/blink.cmp", enabled = true },
    -- Need to choose between blink or nvim-cmp
    { "hrsh7th/nvim-cmp", enabled = false },
    {
        "folke/snacks.nvim",
        opts = {
            dashboard = { enabled = false },
        },
    },
}
