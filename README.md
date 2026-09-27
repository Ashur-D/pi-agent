# 🥧 Pi Coding Agent Configuration & Skills

My personal configuration, extensions, and curated custom skills for the [Pi Coding Agent](https://github.com/earendil-works/pi).

## 📁 Repository Contents

* **`settings.json`**: Theme preferences, default models, thinking levels, and declared package extensions.
* **`web-search.json`**: Web search configuration and defaults.
* **`skills/`**: Library of custom skills (workflow automation, debugging, academic writing, network automation, and system administration).
* **`setup.sh`**: One-line automation script to install prerequisites, Pi CLI, packages, and sync skills.

---

## 🚀 Quick Setup on a New Machine

Clone directly into your Pi agent directory and run the setup script:

```bash
git clone https://github.com/Ashur-D/pi-agent.git ~/.pi/agent
cd ~/.pi/agent
./setup.sh
```

*(Or clone to any folder and run `./setup.sh`—it will automatically sync files to `~/.pi/agent`).*

### Authenticate
After running `setup.sh`, launch Pi and log into your provider:

```bash
pi
/login
```

---

## 🔒 Security

This is a **public** repository. Credentials, API keys, and sensitive tokens are strictly ignored via `.gitignore`:
* `auth.json` (API keys & OAuth tokens)
* `sessions/` (Session history & transcripts)
* `models-store.json` (Cached model catalog)
* `tmp/` and cache directories
