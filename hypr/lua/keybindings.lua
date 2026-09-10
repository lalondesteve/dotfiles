local settings = require("lua.settings")

local function bind(keys, dispatcher, flags)
    hl.bind(keys, dispatcher, flags)
end

-- Keep the useful shortcuts registered before the rest of the configuration loads.
bind("SUPER + CTRL + ALT + SHIFT + T", hl.dsp.exec_cmd(settings.terminal))
bind("SUPER + CTRL + ALT + SHIFT + G", hl.dsp.exec_cmd("Vial"))
bind("SUPER + CTRL + ALT + SHIFT + B", hl.dsp.exec_cmd(settings.browser))
bind("SUPER + CTRL + ALT + SHIFT + S", hl.dsp.exec_cmd(settings.screenshot))
bind("SUPER + SHIFT + S", hl.dsp.exec_cmd('grim -g "$(slurp)" - | wl-copy'))
bind("SUPER + W", hl.dsp.window.close())
bind("SUPER + E", hl.dsp.exec_cmd(settings.file_manager))
bind("SUPER + F", hl.dsp.window.float({ action = "toggle" }))
bind("SUPER + SHIFT + F", hl.dsp.window.fullscreen({ mode = "maximized", action = "toggle" }))
bind("SUPER + S", hl.dsp.layout("togglesplit"))
bind("SUPER + CTRL + ALT + SHIFT + L", hl.dsp.exec_cmd("hyprlock"))
bind("SUPER + CTRL + ALT + SHIFT + Q", hl.dsp.exec_cmd("hyprshutdown"))

bind("SunFront", hl.dsp.exec_cmd("wtype -M ctrl -k a"))

bind("CTRL + SPACE", hl.dsp.exec_cmd("hyprlauncher --toggle --finder desktop"))
bind("CTRL + SHIFT + SPACE", hl.dsp.exec_cmd("hyprlauncher --toggle --finder math"))

for key, direction in pairs({
    left = "l",
    right = "r",
    up = "u",
    down = "d",
    h = "l",
    l = "r",
    k = "u",
    j = "d",
}) do
    bind("SUPER + " .. key, hl.dsp.focus({ direction = direction }))
end

for key, workspace in pairs({
    ["1"] = "1",
    ["2"] = "2",
    ["3"] = "3",
    ["4"] = "4",
    ["5"] = "5",
    ["6"] = "6",
    ["7"] = "7",
    ["8"] = "8",
    ["9"] = "9",
    ["0"] = "10",
}) do
    bind("SUPER + " .. key, hl.dsp.focus({ workspace = workspace }))
end

for key, workspace in pairs({
    ["1"] = "1",
    ["2"] = "2",
    ["3"] = "3",
    ["4"] = "4",
    ["5"] = "5",
    ["6"] = "6",
    ["7"] = "7",
    ["8"] = "8",
    ["9"] = "9",
    ["0"] = "10",
    q = "1",
    w = "2",
    e = "3",
    r = "4",
    t = "5",
}) do
    bind("CTRL + SHIFT + ALT + " .. key, hl.dsp.window.move({ workspace = workspace }))
end

bind("SUPER + mouse_down", hl.dsp.focus({ workspace = "e+1" }))
bind("SUPER + mouse_up", hl.dsp.focus({ workspace = "e-1" }))
bind("SUPER + mouse:272", hl.dsp.window.drag(), { mouse = true })
bind("SUPER + mouse:273", hl.dsp.window.resize(), { mouse = true })

for key, direction in pairs({
    left = "l",
    right = "r",
    up = "u",
    down = "d",
    h = "l",
    l = "r",
    k = "u",
    j = "d",
}) do
    bind("CTRL + SHIFT + ALT + " .. key, hl.dsp.window.move({ direction = direction }))
end

for key, direction in pairs({
    left = "l",
    right = "r",
    up = "u",
    down = "d",
    h = "l",
    l = "r",
    k = "u",
    j = "d",
}) do
    bind("SUPER + SHIFT + " .. key, hl.dsp.window.swap({ direction = direction }))
end

for _, resize in ipairs({
    { "left", -20, 0 },
    { "right", 20, 0 },
    { "up", 0, -20 },
    { "down", 0, 20 },
    { "h", -20, 0 },
    { "j", 0, 20 },
    { "k", 0, -20 },
    { "l", 20, 0 },
    { "y", -100, 0 },
    { "u", 0, 100 },
    { "i", 0, -100 },
    { "o", 100, 0 },
}) do
    bind("SUPER + CTRL + " .. resize[1], hl.dsp.window.resize({ x = resize[2], y = resize[3], relative = true }), { repeating = true })
end

bind("SUPER + O", hl.dsp.layout("splitratio 1"))
bind("CTRL + SHIFT + ALT + O", hl.dsp.layout("splitratio 0.66"))
bind("SUPER + CTRL + ALT + SHIFT + O", hl.dsp.layout("splitratio 0.75"))
