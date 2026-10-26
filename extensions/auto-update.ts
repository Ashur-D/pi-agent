import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // ─── Auto-update on startup (both interactive and T3 Code RPC) ────────────
  pi.on("session_start", async (_event, ctx) => {
    const home = homedir();
    const agentDir = join(home, ".pi", "agent");

    const updateScript = `
      LOCK="/tmp/pi-update.lock"
      if [ -f "$LOCK" ] && kill -0 $(cat "$LOCK" 2>/dev/null) 2>/dev/null; then
        exit 0
      fi
      echo $$ > "$LOCK"
      git -C "${agentDir}" pull --ff-only >/dev/null 2>&1 || true
      npm install -g @earendil-works/pi-coding-agent >/dev/null 2>&1 || true
      pi update --extensions >/dev/null 2>&1 || true
      rm -f "$LOCK"
    `;

    const child = spawn("bash", ["-c", updateScript], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    if (ctx.hasUI && ctx.mode === "tui") {
      // In interactive mode, let the user know background check is active
      // without interrupting startup
    }
  });

  // ─── Manual /update command in chat ───────────────────────────────────────
  pi.registerCommand("update-pi", {
    description: "Update Pi Coding Agent and pull latest configuration from Git",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Checking for Pi updates and pulling latest Git changes...", "info");
      const home = homedir();
      const agentDir = join(home, ".pi", "agent");

      const gitRes = await pi.exec("git", ["-C", agentDir, "pull", "--ff-only"]);
      const npmRes = await pi.exec("npm", ["install", "-g", "@earendil-works/pi-coding-agent"]);
      const extRes = await pi.exec("pi", ["update", "--extensions"]);

      if (npmRes.code === 0 && gitRes.code === 0 && extRes.code === 0) {
        ctx.ui.notify("✨ Pi, extensions, and configuration are up to date!", "info");
      } else {
        ctx.ui.notify("⚠️ Update completed with warnings. Run './setup.sh --doctor' to inspect.", "warning");
      }
    },
  });
}
