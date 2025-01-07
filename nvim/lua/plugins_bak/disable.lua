return {
    { "goolord/alpha-nvim", enable = false },
    { "echasnovski/mini.pairs", enabled = false },
    { "folke/noice.nvim", enabled = false },
    { "nvim-neo-tree/neo-tree.nvim", enabled = false },
    { "saghen/blink.cmp", enabled = false },
    -- Need to choose between blink or nvim-cmp
    { "hrsh7th/nvim-cmp", enabled = true },
    {
        "folke/snacks.nvim",
        opts = {
            dashboard = { enabled = false },
        },
    },
}
