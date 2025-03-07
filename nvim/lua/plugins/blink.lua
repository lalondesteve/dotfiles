return {
  'saghen/blink.cmp',
  dependencies = { 'L3MON4D3/LuaSnip' },
  version = '*',
  -- build = 'cargo build --release',
  ---@module 'blink.cmp'
  ---@type blink.cmp.Config
  opts = {
    -- cmdline = { enabled = false },
    keymap = {
      preset = 'default',
      ["<tab>"] = { 'select_next', 'fallback' },
      ["<S-tab>"] = { 'select_prev', 'fallback' },
      ["<cr>"] = { 'accept', 'fallback' },
    },
    -- This feature is experimental,
    signature = { enabled = true },
    completion = {
      ghost_text = { enabled = true },
      documentation = { auto_show = true, auto_show_delay_ms = 500, window = { border = 'single' } },
      menu = { border = 'single' },
      list = { selection = { preselect = false, auto_insert = true } },
      keyword = { range = 'full' }

    },
    snippets = { preset = 'luasnip' },
    sources = {
      default = { 'lsp', 'path', 'snippets', 'buffer', 'lazydev' },
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
