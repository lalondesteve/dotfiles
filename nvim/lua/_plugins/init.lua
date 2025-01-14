if true then
    return {}
end
return {
    { "folke/lazy.nvim", version="*" },
    { "LazyVim/LazyVim", priority=10000, lazy = false, opts = {}, cond = true, version = "*" },
	{ "folke/snacks.nvim", priority = 1000, lazy = false, opts = {},
	config = function(_, opts)
		local notify = vim.notify
		require("snacks").setup(opts)
		if LazyVim.has("noice.nvim") then
			vim.notify = notify
		end
	end,
	},
}
