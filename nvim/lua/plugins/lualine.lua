return {
  "nvim-lualine/lualine.nvim",
  opts = {
    options = {
      component_separators = { "" },
      section_separators = { "" },
      disabled_filetypes = { statusline = { "dashboard", "alpha", "ministarter", "snacks_dashboard", "minifiles" } },
    },
    sections = {
      lualine_a = {},
      lualine_c = { "mode", "diff" },
      lualine_x = {
        "diagnostics",
        {
          function()
            return "" .. (vim.o.modified and "*" or "")
          end,
          padding = {},
          color = function()
            return { fg = Snacks.util.color("Special") }
          end,
        },
        {
          "filename",
          color = function()
            return {
              fg = (vim.o.modified and Snacks.util.color("Debug") or Snacks.util.color("Statement")),
              gui = (vim.o.modified and "bold" or ""),
            }
          end,
          file_status = false,
          padding = { right = 1 },
        },
        -- {
        --   function()
        --     return "" .. (vim.o.modified and "*" or " ")
        --   end,
        --   padding = {},
        --   color = function()
        --     return { fg = Snacks.util.color("Special") }
        --   end,
        -- },
        { "filetype", padding = { right = 1 } },
      },
      lualine_y = {
        {
          "o:encoding",
          fmt = string.upper,
          icons_enabled = false,
          color = { gui = "bold" },
        },
        "fileformat",
        { "location", padding = { left = 0, right = 1 } },
      },
      lualine_z = {},
    },
  },
}
