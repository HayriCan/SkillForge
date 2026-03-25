<div align="center">

<img src="static/app-icon.png" width="96" alt="Skill Forge logo">

# Skill Forge

**The missing GUI for Claude Code.**

Visually manage your `~/.claude` configuration — agents, skills, MCP servers, profiles, hooks, and more — without ever touching a raw file.

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=latest)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#installation)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

</div>

---

## What is Skill Forge?

Claude Code stores everything in `~/.claude/` — agent definitions, skill prompts, hook scripts, MCP server configs, memory files, settings. It's powerful, but editing raw Markdown and JSON by hand is slow and error-prone.

**Skill Forge** is a native desktop app that puts a clean UI on top of all of it.

- Browse, create, and edit 12 Claude Code resource views through a structured interface
- Switch between named profiles (work, personal, client) in one click
- Search across all your agents, skills, and commands with `Ctrl+K`
- Manage MCP servers without touching `.mcp.json`
- Back up and restore your config as a portable `.sfbackup` bundle
- Use a custom Claude directory from the in-app preferences modal
- Switch the core UI language without editing config files
- Catch validation errors before they silently break your workflows

> Stop editing YAML by hand. Start shipping prompts faster.

---

## Features

| | Feature | Description |
|---|---|---|
| **12 Views** | Full config coverage | Agents, Skills, Commands, Hooks, Plans, Plugins, Sessions, Tasks, Teams, Todos, Config, and Settings |
| **Agents & Skills** | Visual editor | Syntax-highlighted Markdown editor with Markdown view plus raw editing mode for skills |
| **MCP Servers** | GUI management | Add, edit, enable/disable servers without touching JSON |
| **Profiles** | Config snapshots | Save and restore full `.claude` configurations per project or client |
| **Command Palette** | `Ctrl+K` | Fuzzy-search across all 12 resource types instantly |
| **Backup & Restore** | Portable bundles | Export selected capability groups to `.sfbackup`, then restore in merge or overwrite mode |
| **History & Diff** | Change review | See what changed before you overwrite anything |
| **Settings** | Structured + raw JSON | Switch between guided settings sections and direct JSON editing |
| **Preferences** | App-level controls | Change theme, language, and custom Claude directory from one modal |
| **Language Support** | 9 UI languages | English, Deutsch, Français, Japanese, Korean, Polish, Turkish, Simplified Chinese, Traditional Chinese |
| **Validation** | Inline errors | Catch invalid names, malformed JSON, and YAML issues as you type |
| **Syntax Highlighting** | Shiki-powered | Beautiful code blocks inside the Markdown editor |
| **Themes & Updates** | Native app polish | Light/Dark/Auto theme, silent startup checks, in-app download/install, and restart prompts |

---

## Language Support

Skill Forge now includes built-in localization for the app shell and key settings flows. The current UI language options are:

- English
- Deutsch
- Français
- Japanese
- Korean
- Polish
- Turkish
- Simplified Chinese
- Traditional Chinese

You can change the language from `Preferences` inside the app. The localization layer currently covers navigation, menus, preferences, updater messages, and the structured settings UI.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd K` | Command palette — search everything |
| `Ctrl/Cmd S` | Save current file |
| `Ctrl/Cmd N` | New file in active view |
| `1` – `9` | Jump to sidebar views |
| `Ctrl =` / `Ctrl -` | Font size up / down |
| `Escape` | Close modal or palette |

---

## CLI vs Skill Forge

|  | Raw CLI | Skill Forge |
|--|--|--|
| Edit an agent | `vim ~/.claude/agents/x.md` | Visual editor, syntax highlighted |
| Switch configs | Manual copy/paste | One-click profile switch |
| MCP server setup | Edit `.mcp.json` by hand | GUI with form validation |
| Find a file | `ls ~/.claude/agents/` | `Ctrl+K` fuzzy search |
| Backup config | `cp -r ~/.claude ~/backup` | Selective export to `.sfbackup` |
| Catch typos | After the fact | Inline, as you type |

---

## Installation

### Download

| Platform | Package |
|---|---|
| Windows | `.msi` installer |
| macOS | `.dmg` (Universal — Intel + Apple Silicon) |
| Linux | `.AppImage` or `.deb` |

**[Download the latest release](https://github.com/HayriCan/SkillForge/releases/latest)**

> **macOS note:** The app is not notarized with an Apple Developer certificate yet. If macOS blocks the launch, go to **System Settings → Privacy & Security** and click **"Open Anyway"** — or run `xattr -cr /Applications/SkillForge.app` in Terminal.

### Build from Source

If you prefer not to trust unsigned binaries, you can build locally:

```bash
# Prerequisites: Node 20+, Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri build
```

The compiled binary will be in `src-tauri/target/release/bundle/`.

Local source builds do not always match the official release metadata and signing chain, so the in-app updater may be limited or unavailable on self-built binaries.

### Auto-Updates

Official GitHub release builds check for published updates silently on startup. You can also trigger **Check for Updates** from the app menu to open the same install flow manually.

When an update is available, Skill Forge downloads it, installs it in place, and then asks for a restart to finish the upgrade.

Release-built installs are the supported path for auto-updates. Self-built binaries are best-effort only, draft GitHub releases stay invisible until published, and some Linux package formats may still require manual upgrades.

On macOS, the relaunched app can still hit Gatekeeper or notarization prompts after an update is applied. If that happens, use the same **Open Anyway** or `xattr -cr` workaround as the first launch.

### Package Managers

```bash
# macOS — coming soon
brew install skill-forge

# Windows — coming soon
winget install skill-forge
```

---

## Development

**Prerequisites:** Node 20+, Rust stable

```bash
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

**Tech stack:** Tauri 2 · Svelte 5 · TypeScript · Tailwind CSS v4 · Shiki

**Recent product additions:** localization, preferences modal, custom Claude directory support, raw JSON settings mode, raw skill editing mode, and improved backup/restore flow.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE).
