hl.monitor({
    output = "",
    mode = "preferred",
    position = "auto",
    scale = 1,
})

hl.monitor({
    output = "desc:ViewSonic Corporation TD1655",
    mode = "preferred",
    position = "auto-down",
    scale = 1,
})

hl.device({
    name = "foostan-corne-v4",
    kb_options = "",
})

hl.config({
    input = {
        kb_layout = "ca",
        kb_variant = "multix",
        numlock_by_default = true,
        follow_mouse = 2,
        touchpad = {
            natural_scroll = false,
        },
    },
    general = {
        gaps_in = 2,
        gaps_out = 2,
        gaps_workspaces = 50,
        border_size = 2,
        col = {
            active_border = "rgba(0080ffff)",
            inactive_border = "rgba(0070ff55)",
        },
        resize_on_border = false,
        allow_tearing = false,
        layout = "dwindle",
    },
    decoration = {
        rounding = 4,
        active_opacity = 1.0,
        inactive_opacity = 0.9,
        shadow = {
            enabled = true,
            color = "rgba(1a1a1aee)",
        },
        blur = {
            enabled = true,
            size = 3,
            passes = 1,
            vibrancy = 0.1696,
        },
    },
    animations = {
        enabled = true,
    },
    dwindle = {
        preserve_split = true,
    },
    misc = {
        force_default_wallpaper = 0,
        disable_hyprland_logo = false,
    },
})

hl.curve("myBezier", {
    type = "bezier",
    points = {{ 1, 0 }, { 0, 1 }},
})

hl.curve("easeInOut", {
    type = "bezier",
    points = {{ 0.42, 0 }, { 0.58, 1 }},
})

for _, leaf in ipairs({ "windows", "windowsOut", "border", "borderangle", "fade", "workspaces" }) do
    hl.animation({
        leaf = leaf,
        enabled = true,
        speed = 1.5,
        bezier = "myBezier",
    })
end
