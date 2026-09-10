return {
    browser = "zen-browser",
    terminal = "ghostty",
    file_manager = "dolphin",
    screenshot = 'mkdir -p "$HOME/screenshots" && grim -o "$(hyprctl -j monitors | jq -er \'.[] | select(.focused) | .name\')" "$HOME/screenshots/$(date +%Y%m%d_%H%M%S).png"',
}
