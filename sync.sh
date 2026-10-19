#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$HOME/.pi/agent"
T3_USERDATA="$HOME/.t3/userdata"

echo "=========================================================="
echo "  🔄 Sync Live Pi & T3 Code Settings to Project Repo      "
echo "=========================================================="
echo ""

# 1. Sync T3 Code configuration from ~/.t3/userdata -> repo/t3
if [ -d "$T3_USERDATA" ]; then
    echo ":: Syncing T3 Code configs from $T3_USERDATA -> $SCRIPT_DIR/t3..."
    mkdir -p "$SCRIPT_DIR/t3"

    for file in client-settings.json desktop-settings.json keybindings.json keybindings-migrations; do
        if [ -f "$T3_USERDATA/$file" ]; then
            cp "$T3_USERDATA/$file" "$SCRIPT_DIR/t3/$file"
            echo "   [✓] $file"
        fi
    done

    # Sync and sanitize settings.json (strip any plaintext API keys before committing)
    if [ -f "$T3_USERDATA/settings.json" ]; then
        node -e '
        const fs = require("fs");
        const srcPath = process.argv[1];
        const destPath = process.argv[2];
        try {
            const data = JSON.parse(fs.readFileSync(srcPath, "utf8"));
            if (data.providerInstances) {
                for (const p of Object.values(data.providerInstances)) {
                    if (p && p.config && typeof p.config.apiKey === "string") {
                        p.config.apiKey = "";
                    }
                }
            }
            fs.writeFileSync(destPath, JSON.stringify(data, null, 2) + "\n", "utf8");
            console.log("   [✓] settings.json (sanitized secrets)");
        } catch (e) {
            console.error("   [!] Error parsing settings.json:", e.message);
        }
        ' "$T3_USERDATA/settings.json" "$SCRIPT_DIR/t3/settings.json"
    fi
else
    echo ":: ⚠️  T3 Code userdata directory ($T3_USERDATA) not found."
fi

# 2. Check if git repository is present and show status
echo ""
echo ":: Checking Git changes..."
if command -v git &>/dev/null && [ -d "$SCRIPT_DIR/.git" ]; then
    git -C "$SCRIPT_DIR" status --short
fi

echo ""
echo "✨ Sync complete! You can now review changes with 'git diff' and commit them."
