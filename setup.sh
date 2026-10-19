#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="$HOME/.pi/agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
T3_USERDATA="$HOME/.t3/userdata"

# Handle --sync or -s flag to sync live configs into repo
if [[ "${1:-}" == "--sync" || "${1:-}" == "-s" ]]; then
    exec "$SCRIPT_DIR/sync.sh"
fi

echo "=========================================================="
echo "  🚀 Pi Agent + T3 Code Universal Manager (Linux / macOS) "
echo "=========================================================="
echo ""
echo "Select an option:"
echo "  1) Install / Update (Pi Agent + T3 Code)"
echo "  2) Uninstall Everything"
echo "  3) Exit"
echo ""
read -rp "Enter choice [1-3] (default: 1): " choice || choice="1"
choice="${choice:-1}"

if [ "$choice" = "3" ]; then
    echo ":: Exiting."
    exit 0
fi

# ========================================================
# UNINSTALL PROCEDURE
# ========================================================
if [ "$choice" = "2" ]; then
    echo ""
    echo ":: ⚠️  UNINSTALL PROCEDURE"
    read -rp ":: Are you sure you want to completely remove Pi Agent and T3 Code? [y/N]: " confirm || confirm="N"
    confirm="${confirm:-N}"
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo ":: Uninstall cancelled."
        exit 0
    fi

    echo ":: 1/5 Unlinking T3 Connect..."
    if command -v t3 &>/dev/null; then
        t3 connect unlink 2>/dev/null || true
    fi

    echo ":: 2/5 Removing Pi CLI globally..."
    npm uninstall -g @earendil-works/pi-coding-agent 2>/dev/null || true

    echo ":: 3/5 Removing ~/.pi directory..."
    rm -rf "$HOME/.pi"

    echo ":: 4/5 Uninstalling T3 Code..."
    if command -v yay &>/dev/null && (pacman -Qi t3code-nightly-bin &>/dev/null || pacman -Qi t3code-bin &>/dev/null); then
        yay -R --noconfirm t3code-nightly-bin 2>/dev/null || yay -R --noconfirm t3code-bin 2>/dev/null || true
    elif command -v apt-get &>/dev/null && dpkg -l t3code &>/dev/null; then
        sudo apt-get remove -y t3code 2>/dev/null || true
    elif command -v brew &>/dev/null; then
        brew uninstall --cask t3-code 2>/dev/null || true
    fi
    rm -f "$HOME/.local/bin/t3" "$HOME/.local/bin/t3code"

    echo ":: 5/5 Removing ~/.t3 directory..."
    rm -rf "$HOME/.t3"

    echo ""
    echo "=========================================================="
    echo "  ✨ Uninstallation completed successfully!               "
    echo "=========================================================="
    exit 0
fi

# ========================================================
# INSTALL / UPDATE PROCEDURE
# ========================================================
install_prereqs() {
    local pkgs=("$@")
    echo ":: Installing missing dependencies: ${pkgs[*]}..."
    if command -v yay &>/dev/null; then
        yay -S --needed --noconfirm "${pkgs[@]}"
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --needed --noconfirm "${pkgs[@]}"
    elif command -v apt-get &>/dev/null; then
        sudo apt-get update && sudo apt-get install -y "${pkgs[@]}"
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y "${pkgs[@]}"
    elif command -v brew &>/dev/null; then
        brew install "${pkgs[@]}"
    else
        echo ":: ⚠️  Unknown package manager. Please ensure Node.js, npm, ripgrep, and fd are installed."
    fi
}

echo ""
echo ":: Step 1/4: Checking core system dependencies..."
MISSING=()
for cmd in node npm git rg fd; do
    if ! command -v "$cmd" &>/dev/null; then
        case "$cmd" in
            node) MISSING+=("nodejs") ;;
            rg)   MISSING+=("ripgrep") ;;
            *)    MISSING+=("$cmd") ;;
        esac
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    install_prereqs "${MISSING[@]}"
else
    echo ":: All core dependencies found (node, npm, git, ripgrep, fd)."
fi

# 2. Configure npm user prefix (~/.local) so global installs do not need sudo
echo ""
echo ":: Step 2/4: Configuring npm global prefix..."
mkdir -p "$HOME/.local/bin" "$HOME/.local/lib"
npm config set prefix "$HOME/.local"
export PATH="$HOME/.local/bin:$PATH"

# 3. Install / Sync Pi Agent and Config
echo ""
echo ":: Step 3/4: Setting up Pi Coding Agent..."
npm install -g @earendil-works/pi-coding-agent

if [ "$SCRIPT_DIR" != "$TARGET_DIR" ]; then
    echo ":: Syncing configuration and skills into $TARGET_DIR..."
    mkdir -p "$TARGET_DIR"
    cp -u "$SCRIPT_DIR/settings.json" "$TARGET_DIR/" 2>/dev/null || true
    cp -u "$SCRIPT_DIR/web-search.json" "$TARGET_DIR/" 2>/dev/null || true
    cp -u "$SCRIPT_DIR/zentui.json" "$TARGET_DIR/" 2>/dev/null || true
    cp -u "$SCRIPT_DIR/keybindings.json" "$TARGET_DIR/" 2>/dev/null || true
    mkdir -p "$TARGET_DIR/extensions"
    cp -ru "$SCRIPT_DIR/extensions/." "$TARGET_DIR/extensions/" 2>/dev/null || true
    mkdir -p "$TARGET_DIR/skills"
    cp -ru "$SCRIPT_DIR/skills/." "$TARGET_DIR/skills/" 2>/dev/null || true
    if [ -d "$SCRIPT_DIR/t3" ]; then
        mkdir -p "$TARGET_DIR/t3"
        cp -ru "$SCRIPT_DIR/t3/." "$TARGET_DIR/t3/" 2>/dev/null || true
    fi
elif [ -d "$TARGET_DIR/.git" ]; then
    echo ":: Pulling latest changes in $TARGET_DIR..."
    git -C "$TARGET_DIR" pull --ff-only 2>/dev/null || true
fi

echo ":: Installing declared Pi extensions & themes..."
cd "$TARGET_DIR"
pi update --extensions || true

# 4. Optional: Configure T3 Code with Pi as default engine
echo ""
echo ":: Step 4/4: T3 Code integration..."
read -rp ":: Would you like to configure T3 Code to use Pi as its default agent engine? [Y/n]: " setup_t3 || setup_t3="n"
setup_t3="${setup_t3:-Y}"

if [[ "$setup_t3" =~ ^[Yy]$ ]]; then
    if ! command -v t3code &>/dev/null && ! command -v t3 &>/dev/null; then
        echo ":: T3 Code is not detected on your system."
        read -rp ":: Would you like to install T3 Code (Nightly) now? [Y/n]: " install_t3 || install_t3="n"
        install_t3="${install_t3:-Y}"
        if [[ "$install_t3" =~ ^[Yy]$ ]]; then
            if command -v yay &>/dev/null; then
                echo ":: Installing T3 Code Nightly via AUR (yay)..."
                yay -S --needed --noconfirm t3code-nightly-bin
            elif command -v brew &>/dev/null; then
                echo ":: Installing T3 Code via Homebrew..."
                brew install --cask t3-code
            else
                echo ":: Downloading and running official T3 Code Nightly installer..."
                curl -fsSL https://t3.codes/install.sh | T3CODE_CHANNEL=nightly sh
            fi
        fi
    else
        echo ":: T3 Code is already installed."
    fi

    echo ":: Configuring T3 Code settings (~/.t3/userdata)..."
    mkdir -p "$T3_USERDATA"
    T3_SOURCE=""
    if [ -d "$TARGET_DIR/t3" ]; then
        T3_SOURCE="$TARGET_DIR/t3"
    elif [ -d "$SCRIPT_DIR/t3" ]; then
        T3_SOURCE="$SCRIPT_DIR/t3"
    fi

    if [ -n "$T3_SOURCE" ]; then
        echo ":: Syncing custom T3 Code configuration into $T3_USERDATA..."
        for file in client-settings.json desktop-settings.json keybindings.json keybindings-migrations; do
            if [ -f "$T3_SOURCE/$file" ]; then
                cp -u "$T3_SOURCE/$file" "$T3_USERDATA/" 2>/dev/null || cp "$T3_SOURCE/$file" "$T3_USERDATA/" 2>/dev/null || true
            fi
        done
        if [ -f "$T3_SOURCE/settings.json" ] && [ ! -f "$T3_USERDATA/settings.json" ]; then
            cp "$T3_SOURCE/settings.json" "$T3_USERDATA/"
        fi
    fi

    SETTINGS_FILE="$T3_USERDATA/settings.json"
    T3_SRC_SETTINGS="${T3_SOURCE:+$T3_SOURCE/settings.json}"

    node -e '
    const fs = require("fs");
    const targetPath = process.argv[1];
    const sourcePath = process.argv[2];
    let data = {};
    if (fs.existsSync(targetPath)) {
        try { data = JSON.parse(fs.readFileSync(targetPath, "utf8")); } catch (e) {}
    }
    if (sourcePath && fs.existsSync(sourcePath)) {
        try {
            const src = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
            if (src.favorites && (!data.favorites || data.favorites.length === 0)) {
                data.favorites = src.favorites;
            }
            if (src.providerModelPreferences && !data.providerModelPreferences) {
                data.providerModelPreferences = src.providerModelPreferences;
            }
        } catch (e) {}
    }
    data.defaultModelSelection = {
        instanceId: "pi",
        model: "antigravity/gemini-3.8-flash"
    };
    data.providerInstances = data.providerInstances || {};
    data.providerInstances.pi = {
        driver: "pi",
        displayName: "Pi",
        enabled: true
    };
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf8");
    console.log(":: Set Pi as default engine in " + targetPath);
    ' "$SETTINGS_FILE" "${T3_SRC_SETTINGS:-}"
fi

echo ""
echo "=========================================================="
echo "  ✨ Setup completed successfully!                        "
echo "=========================================================="
if [ ! -f "$TARGET_DIR/auth.json" ]; then
    echo ":: 🔑 Next step: Run 'pi' in your terminal and type '/login' to authenticate."
else
    echo ":: 🔑 Credentials found. Pi is ready to use!"
fi
