if true then
	return {}
end
return {

	{
		"folke/snacks.nvim",
		cmd = "Snacks",
		lazy = false,
		priority = 1000,
		opts = {
			dashboard = { enabled = false },
			indent = { enabled = true },
			input = { enabled = true },
			notifier = { enabled = true },
			scope = { enabled = true },
			scroll = { enabled = true },
			statuscolumn = { enabled = true },
			toggle = { map = vim.safe_keymap_set },
			terminal = { enabled = true },
			words = { enabled = true },
		},
  -- stylua: ignore
  keys = {
    { "<leader>nn", function() Snacks.notifier.show_history() end, desc = "Notification History" },
    { "<leader>nd", function() Snacks.notifier.hide() end, desc = "Dismiss All Notifications" },
    { "<leader>wt", function() Snacks.terminal.toggle() end, desc = "Toggle Terminal" },
  },
	},
}
