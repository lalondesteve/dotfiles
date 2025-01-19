-- Terminal Mappings
local function term_nav(dir)
	---@param self snacks.terminal
	return function(self)
		return self:is_floating() and "<c-" .. dir .. ">" or vim.schedule(function()
			vim.cmd.wincmd(dir)
		end)
	end
end

-- local notify = vim.notify

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
			scope = { enabled = false },
			scroll = { enabled = true },
			statuscolumn = { enabled = true },
			toggle = { map = vim.safe_keymap_set },
			words = { enabled = true },
			bigfile = { enabled = true },
			quickfile = { enabled = true },
			terminal = {
				win = {
					keys = {
						nav_h = { "<C-h>", term_nav("h"), desc = "Go to Left Window", expr = true, mode = "t" },
						nav_j = { "<C-j>", term_nav("j"), desc = "Go to Lower Window", expr = true, mode = "t" },
						nav_k = { "<C-k>", term_nav("k"), desc = "Go to Upper Window", expr = true, mode = "t" },
						nav_l = { "<C-l>", term_nav("l"), desc = "Go to Right Window", expr = true, mode = "t" },
					},
				},
			},
		},
  -- stylua: ignore
  keys = {
    -- { "<leader>nn", function() Snacks.notifier.show_history() end, desc = "Notification History" },
    -- { "<leader>nd", function() Snacks.notifier.hide() end, desc = "Dismiss All Notifications" },
    { "<leader>wt", function() Snacks.terminal.toggle() end, desc = "Toggle Terminal" },
  },
	},
	{
		"j-hui/fidget.nvim",
		opts = { notification = { override_vim_notify = true } },
		keys = {
			{
				"<leader>nn",
				"<cmd>Fidget history<cr>",
				desc = "Notification History",
			},
			{
				"<leader>nd",
				"<cmd>Fidget clear_history<cr>",
				desc = "Dismiss All Notifications",
			},
		},
		-- init = function()
		-- 	vim.notify = notify
		-- end,
	},
}
