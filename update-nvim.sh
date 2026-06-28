#!/bin/bash
set -euo pipefail

INSTALL_DIR="$HOME/.local/nvim"
BIN_DIR="$HOME/.local/bin"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

get_latest_version() {
    curl -fsSL https://api.github.com/repos/neovim/neovim/releases/latest \
        | grep '"tag_name"' \
        | head -1 \
        | sed -E 's/.*"v?([^"]+)".*/\1/'
}

current_version() {
    "$INSTALL_DIR/bin/nvim" --version 2>/dev/null | head -1 | sed -E 's/.*v?([0-9.]+).*/\1/' || echo "none"
}

VERSION="$(get_latest_version)"
CURRENT="$(current_version)"

if [[ "$VERSION" == "$CURRENT" ]]; then
    echo "neovim v$CURRENT is already up to date"
    exit 0
fi

echo "Updating neovim: v$CURRENT -> v$VERSION"
URL="https://github.com/neovim/neovim/releases/download/v${VERSION}/nvim-linux-x86_64.tar.gz"
curl -fsSL "$URL" -o "$TMP/nvim.tar.gz"

rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
tar -xzf "$TMP/nvim.tar.gz" -C "$INSTALL_DIR" --strip-components=1

mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/bin/nvim" "$BIN_DIR/nvim"

"$INSTALL_DIR/bin/nvim" --version | head -1
