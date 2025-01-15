return {
    "akinsho/bufferline.nvim",
    event = "VeryLazy",
    version = "*",
    dependencies = "nvim-tree/nvim-web-devicons",
    keys = {
        { "<S-h>", "<cmd>BufferLineCyclePrev<cr>", desc = "Prev Buffer" },
        { "<S-l>", "<cmd>BufferLineCycleNext<cr>", desc = "Next Buffer" },
    },
    opts = {
        options = {close_command = function(n) Snacks.bufdelete(n) end, always_show_bufferline = false, }
    },
    config = function(_, opts)
        vim.opt.termguicolors = true
        require("bufferline").setup(opts)
        vim.api.nvim_create_autocmd({"BufAdd", "BufDelete"},{
        callback = function()
            vim.schedule(function() pcall(nvim_bufferline) end)
        end,
        })
    end,
}
