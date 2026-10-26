# 🥧 Pi Coding Agent Configuration & Skills

My personal configuration, extensions, and curated custom skills for the [Pi Coding Agent](https://github.com/earendil-works/pi).

## 📁 Repository Contents
* **`settings.json`**: Theme preferences, default models, thinking levels, and declared package extensions.
* **`web-search.json`**: Web search configuration and defaults.
* **`zentui.json`**: ZenTUI customized themes and dashboard settings.
* **`skills/`**: Library of custom skills (workflow automation, debugging, academic writing, network automation, and system administration).
* **`t3/`**: Curated T3 Code configuration (font setup, custom keybindings, model preferences, and favorites).
* **`bin/`**: Universal management tools (`setup.sh`, `setup.ps1`, `sync.sh`, `sync.ps1`).
---

## 🚀 Quick Setup on a New Machine

Clone directly into your Pi agent directory and run the setup script:

```bash
git clone https://github.com/Ashur-D/pi-agent.git ~/.pi/agent
cd ~/.pi/agent
./bin/setup.sh
```

*(Or clone to any folder and run `./bin/setup.sh`—it will automatically sync files to `~/.pi/agent`).*

### Authenticate
After running `./bin/setup.sh`, launch Pi and log into your provider:

```bash
pi
/login
```


---

## 🩺 System Health Check (Doctor)

Run the built-in health check to inspect Node.js, CLI dependencies, Pi installation, auth credentials, and T3 Code integration:

```bash
./bin/setup.sh --doctor    # Windows: .\bin\setup.ps1 -Doctor
```

---


## 🔄 Keeping T3 Code Settings in Sync

Whenever you tweak keybindings, fonts, model favorites, or composer settings in T3 Code:

```bash
pi-sync                    # from ANY directory (Windows: .\bin\sync.ps1)
# Or from inside Pi chat:
/sync
```

This safely pulls your live configuration from `~/.t3/userdata` into `t3/` (sanitizing secrets) and commits and pushes directly to GitHub in one step.

---

## 🔒 Security

This is a **public** repository. Credentials, API keys, and sensitive tokens are strictly ignored via `.gitignore`:
* `auth.json` (API keys & OAuth tokens)
* `sessions/` (Session history & transcripts)
* `models-store.json` (Cached model catalog)
* `tmp/` and cache directories
