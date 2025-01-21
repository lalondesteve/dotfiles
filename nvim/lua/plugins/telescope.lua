return {
  'nvim-telescope/telescope.nvim',
  event = 'VimEnter',
  cmd = "Telescope",
  dependencies = {
    'nvim-lua/plenary.nvim',
    { 'nvim-telescope/telescope-fzf-native.nvim', build = 'make' },
    'nvim-telescope/telescope-ui-select.nvim',
  },
  config = function()
    local t = require('telescope')
    t.load_extension("fzf")
    t.load_extension("ui-select")
  end,
  keys = {
    { "<leader>sf", "<cmd>Telescope find_files<cr>",                { desc = "Telescope Search Files" } },
    { "<leader>sb", "<cmd>Telescope buffers<cr>",                   { desc = "Telescope Search Buffers" } },
    { "<leader>sh", "<cmd>Telescope help_tags<cr>",                 { desc = "Telescope Search Help" } },
    { "<leader>sw", "<cmd>Telescope grep_string<cr>",               { desc = "Telescope Search Word" } },
    { "<leader>sd", "<cmd>Telescope diagnostics<cr>",               { desc = "Telescope Search Diagnostics" } },
    { "<leader>/",  "<cmd>Telescope current_buffer_fuzzy_find<cr>", { desc = "Telescope Search in Buffer" } },
  }
}
