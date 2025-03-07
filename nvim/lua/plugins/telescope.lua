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
    { "<leader>sf", "<cmd>Telescope find_files<cr>",                { desc = "Search Files" } },
    { "<leader>sg", "<cmd>Telescope live_grep<cr>",                 { desc = "Search Workspace" } },
    { "<leader>sh", "<cmd>Telescope help_tags<cr>",                 { desc = "Search Help" } },
    { "<leader>sw", "<cmd>Telescope grep_string<cr>",               { desc = "Search Word" } },
    { "<leader>sd", "<cmd>Telescope diagnostics<cr>",               { desc = "Search Diagnostics" } },
    { "<leader>/",  "<cmd>Telescope current_buffer_fuzzy_find<cr>", { desc = "Buffer Search" } },
    { "<leader>sc", "<cmd>Telescope current_buffer_fuzzy_find<cr>", { desc = "Buffer Search" } },
    { "<leader>su", "<cmd>Telescope lsp_references<cr>",            { desc = "Search Usages" } },
    { "<leader>sq", "<cmd>Telescope quickfix<cr>",                  { desc = "Search Quickfix" } },
    { "<leader>st", "<cmd>Telescope current_buffer_tags<cr>",       { desc = "Search Tags" } },
    { "<leader>sv", "<cmd>Telescope lsp_definitions<cr>",           { desc = "Search Definitions" } },
    { "<leader>si", "<cmd>Telescope lsp_implementations<cr>",       { desc = "Search Implementations" } },
    { "<leader>sk", "<cmd>Telescope keymaps<cr>",                   { desc = "Search Keymaps" } },
  }
}
