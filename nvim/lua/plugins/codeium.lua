if true then
  return {}
end
return {
  "Exafunction/codeium.nvim",
  opts = {
    virtual_text = {
      enabled = true,
      filetypes = {
        dashboard = false,
        alpha = false,
        ministarter = false,
        snacks_dashboard = false,
        minifiles = false,
      },
    },
  },
}
