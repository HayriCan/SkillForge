<div align="center">

<img src="static/app-icon.png" width="96" alt="Skill Forge logo">

# Skill Forge

**The missing GUI for Claude Code.**

Visually manage your `~/.claude` configuration — agents, skills, MCP servers, profiles, hooks, and more — without ever touching a raw file.

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/skill-forge?color=blueviolet&label=latest)](https://github.com/HayriCan/skill-forge/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#installation)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

</div>

---

## What is Skill Forge?

Claude Code stores everything in `~/.claude/` — agent definitions, skill prompts, hook scripts, MCP server configs, memory files, settings. It's powerful, but editing raw Markdown and JSON by hand is slow and error-prone.

**Skill Forge** is a native desktop app that puts a clean UI on top of all of it.

- Browse, create, and edit every resource type through a structured interface
- Switch between named profiles (work, personal, client) in one click
- Search across all your agents, skills, and commands with `Ctrl+K`
- Manage MCP servers without touching `.mcp.json`
- Back up and restore your entire config as a portable bundle
- Catch validation errors before they silently break your workflows

> Stop editing YAML by hand. Start shipping prompts faster.

---

## Features

| | Feature | Description |
|---|---|---|
| **Agents & Skills** | Visual editor | Syntax-highlighted Markdown editor with live preview |
| **MCP Servers** | GUI management | Add, edit, enable/disable servers without touching JSON |
| **Profiles** | Config snapshots | Save and restore full `.claude` configurations per project or client |
| **Command Palette** | `Ctrl+K` | Fuzzy-search across all 12 resource types instantly |
| **Backup & Restore** | Portable bundles | Export your entire config as a `.zip`, restore anytime |
| **History & Diff** | Change review | See what changed before you overwrite anything |
| **Validation** | Inline errors | Catch invalid names, malformed JSON, and YAML issues as you type |
| **Syntax Highlighting** | Shiki-powered | Beautiful code blocks inside the Markdown editor |
| **Themes** | Light / Dark | Auto-detects system preference, or override manually |

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
| Backup config | `cp -r ~/.claude ~/backup` | One-click export to zip |
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

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE).
