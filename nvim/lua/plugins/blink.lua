return {
  'saghen/blink.cmp',
  -- enabled = false,
  dependencies = 'rafamadriz/friendly-snippets',
  version = '*',
  -- build = 'cargo build --release',
  ---@module 'blink.cmp'
  ---@type blink.cmp.Config
  opts = {
    keymap = { preset = 'default', ['<tab>'] = { 'select_next' }, ['<S-tab>'] = { 'select_next' }, ["<cr>"] = { 'accept' } },
    appearance = {
      use_nvim_cmp_as_default = true,
      nerd_font_variant = 'mono'
    },
    sources = {
      cmdline = {},
      default = { 'lsp', 'path', 'snippets', 'buffer', "lazydev", },
      providers = { lazydev = { name = "LazyDev", module = "lazydev.integrations.blink", score_offset = 100 } },
    },
    completion = { documentation = { auto_show = true, auto_show_delay_ms = 200 } }
  },
  opts_extend = { "sources.default" }
}
