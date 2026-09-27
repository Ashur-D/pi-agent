#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="$HOME/.pi/agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ":: 🚀 Initializing Pi Coding Agent setup..."

# 1. Install prerequisites based on package manager
install_packages() {
    local pkgs=("$@")
    if command -v yay &>/dev/null; then
        yay -S --needed --noconfirm "${pkgs[@]}"
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --needed --noconfirm "${pkgs[@]}"
    elif command -v apt-get &>/dev/null; then
        sudo apt-get update && sudo apt-get install -y "${pkgs[@]}"
    elif command -v brew &>/dev/null; then
        brew install "${pkgs[@]}"
    else
        echo ":: ⚠️  Unknown package manager. Please ensure Node.js, npm, ripgrep, and fd are installed."
    fi
}

echo ":: Checking prerequisites..."
if command -v pacman &>/dev/null; then
    MISSING=()
    for p in nodejs npm ripgrep fd; do
        if ! pacman -Qi "$p" &>/dev/null; then
            MISSING+=("$p")
        fi
    done
    if [ ${#MISSING[@]} -gt 0 ]; then
        echo ":: Installing: ${MISSING[*]}"
        install_packages "${MISSING[@]}"
    fi
fi

# 2. Configure npm user prefix (~/.local) so global installs do not need sudo
echo ":: Configuring npm prefix to ~/.local..."
mkdir -p "$HOME/.local/bin" "$HOME/.local/lib"
npm config set prefix "$HOME/.local"
export PATH="$HOME/.local/bin:$PATH"

# 3. Install or update Pi CLI
echo ":: Installing/updating @earendil-works/pi-coding-agent..."
npm install -g @earendil-works/pi-coding-agent

# 4. If this repo was cloned outside ~/.pi/agent, sync files into place
if [ "$SCRIPT_DIR" != "$TARGET_DIR" ]; then
    echo ":: Syncing configs and skills into $TARGET_DIR..."
    mkdir -p "$TARGET_DIR"
    cp -u "$SCRIPT_DIR/settings.json" "$TARGET_DIR/" 2>/dev/null || true
    cp -u "$SCRIPT_DIR/web-search.json" "$TARGET_DIR/" 2>/dev/null || true
    mkdir -p "$TARGET_DIR/skills"
    cp -ru "$SCRIPT_DIR/skills/." "$TARGET_DIR/skills/" 2>/dev/null || true
fi

# 5. Restore Pi packages/extensions declared in settings.json
echo ":: Installing Pi packages and extensions..."
pi update --extensions || true

echo ""
echo ":: ✨ Setup completed successfully!"
if [ ! -f "$TARGET_DIR/auth.json" ]; then
    echo ":: 🔑 Next step: Run 'pi' in your terminal and type '/login' to set up your API keys."
else
    echo ":: 🔑 Credentials found in auth.json. You're ready to go!"
fi
