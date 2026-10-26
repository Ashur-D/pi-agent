# 🥧 Pi Agent + T3 Code

Personal configuration, skills, and setup for [Pi Coding Agent](https://github.com/earendil-works/pi) and [T3 Code](https://t3.codes).

## 🚀 Setup

```bash
git clone https://github.com/Ashur-D/pi-agent.git ~/.pi/agent
cd ~/.pi/agent
./bin/setup.sh    # Windows: .\bin\setup.ps1
```

Then authenticate:
```bash
pi
/login
```

## 🔄 Sync Settings to GitHub

Whenever you change keybindings, fonts, or models:

```bash
pi-sync
```
*(Or type `/sync` directly inside Pi chat)*

## 🩺 Health Check

```bash
./bin/setup.sh --doctor    # Windows: .\bin\setup.ps1 -Doctor
```
