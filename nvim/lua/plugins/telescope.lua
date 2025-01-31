return {
  'nvim-telescope/telescope.nvim',
  event = 'VimEnter',
  cmd = "Telescope",
  dependencies = {
    'nvim-lua/plenary.nvim',
    {
      'nvim-telescope/telescope-fzf-native.nvim',
      build = 'make',
      config = function()
        require('telescope').load_extension('fzf')
      end
    },
    {
      'nvim-telescope/telescope-ui-select.nvim',
      config = function()
        require('telescope').load_extension('ui-select')
      end
    },
    'nvim-treesitter/nvim-treesitter',
  },
  version = false,
  opts = {
    defaults = { wrap_results = true, },
    pickers = {
      diagnostics = { line_width = 'full', },
    }

  },
  keys = {
    { "<leader>sf", "<cmd>Telescope find_files<cr>",                { desc = "Telescope Search Files" } },
    { "<leader>sg", "<cmd>Telescope live_grep<cr>",                 { desc = "Telescope Search Files" } },
    { "<leader>sb", "<cmd>Telescope buffers<cr>",                   { desc = "Telescope Search Buffers" } },
    { "<leader>sh", "<cmd>Telescope help_tags<cr>",                 { desc = "Telescope Search Help" } },
    { "<leader>sw", "<cmd>Telescope grep_string<cr>",               { desc = "Telescope Search Word" } },
    { "<leader>sd", "<cmd>Telescope diagnostics<cr>",               { desc = "Telescope Search Diagnostics" } },
    { "<leader>/",  "<cmd>Telescope current_buffer_fuzzy_find<cr>", { desc = "Telescope Buffer Search" } },
    { "<leader>s%", "<cmd>Telescope current_buffer_fuzzy_find<cr>", { desc = "Telescope Buffer Search" } },
  }
}
