local primary_monitor = "desc:LG Electronics LG HDR WQHD"

for workspace = 1, 5 do
    hl.workspace_rule({
        workspace = tostring(workspace),
        monitor = primary_monitor,
    })
end

hl.window_rule({
    match = { title = "^(pavucontrol)$" },
    float = true,
})

hl.window_rule({
    match = { title = "^(btop)$" },
    float = true,
})

hl.window_rule({
    match = { title = "^(update-sys)$" },
    float = true,
})

hl.window_rule({
    match = { title = "^.*(Disney+|YouTube).*$" },
    opaque = true,
})
