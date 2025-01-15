return {
  "nvim-telescope/telescope.nvim",

  dependencies = {
      "nvim-lua/plenary.nvim"
  },

  config = function()
    require('telescope').setup({})
    local builtin = require('telescope.builtin')
    vim.keymap.set('n', '<leader>ff', builtin.find_files, {desc = "Find Files"})
    vim.keymap.set('n', '<leader>fw', function()
      local word = vim.fn.expand('<cword>')
        builtin.grep_string({search=word})
    end, {desc = "Find Word"})
    vim.keymap.set('n', '<leader>fh', builtin.help_tags, {desc = "Help Tags"})
  end,

}
