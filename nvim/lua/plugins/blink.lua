return {
  'saghen/blink.cmp',
  dependencies = { 'rafamadriz/friendly-snippets', 'L3MON4D3/LuaSnip' },
  version = '*',
  -- build = 'cargo build --release',
  ---@module 'blink.cmp'
  ---@type blink.cmp.Config
  opts = {
    keymap = {
      preset = 'default',
      ["<tab>"] = { 'select_next', 'fallback' },
      ["<S-tab>"] = { 'select_prev', 'fallback' },
      ["<cr>"] = { 'select_and_accept', 'fallback' },
    },
    -- This feature is experimental,
    signature = { enabled = true },
    completion = {
      ghost_text = { enabled = true },
      documentation = { auto_show = true, auto_show_delay_ms = 500, window = { border = 'single' } },
      menu = { border = 'single' },

    },
    sources = {
      default = { 'lsp', 'path', 'snippets', 'buffer', 'lazydev' },
      cmdline = {},
      providers = {
        lazydev = {
          name = "LazyDev",
          module = "lazydev.integrations.blink",
          score_offset = 100, -- show at a higher priority than lsp
        },
      },
    },
  },
  opts_extend = { "sources.default" },
}
