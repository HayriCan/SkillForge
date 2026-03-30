<div align="center">

<img src="static/app-icon.png" width="96" alt="Skill Forge logo">

# Skill Forge

**The missing GUI for Claude Code, Codex CLI & Gemini CLI.**

Visually manage your CLI configuration — agents, skills, MCP servers, profiles, hooks, and any custom folder — without ever touching a raw file.

[![GitHub release](https://img.shields.io/github/v/release/HayriCan/SkillForge?color=blueviolet&label=latest)](https://github.com/HayriCan/SkillForge/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#installation)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)

**English** | **[Türkçe](README_TR.md)** | **[简体中文](README_ZH.md)** | **[Deutsch](README_DE.md)** | **[Français](README_FR.md)** | **[日本語](README_JA.md)** | **[한국어](README_KO.md)** | **[Polski](README_PL.md)** | **[繁體中文](README_ZH_TW.md)**

</div>

---

## What is Skill Forge?

Claude Code stores everything in `~/.claude/`, Codex CLI in `~/.codex/`, and Gemini CLI in `~/.gemini/`. Agent definitions, skill prompts, hook scripts, MCP server configs, memory files, settings — it's powerful, but editing raw Markdown and JSON by hand is slow and error-prone.

**Skill Forge** is a native desktop app that puts a clean UI on top of all of it.

- **Multi-CLI support** — switch between Claude Code, Codex CLI, and Gemini CLI from the sidebar
- Browse, create, and edit resources through a structured interface with dedicated views
- **Dynamic folder browser** — discover and toggle any custom directory, browse files with breadcrumb navigation, edit text files with line numbers, preview HTML
- Switch between named profiles (work, personal, client) in one click
- Search across all your agents, skills, and commands with `Ctrl+K`
- Manage MCP servers without touching `.mcp.json`
- Edit global instructions (CLAUDE.md, AGENTS.md) directly from Settings with Rich/Raw toggle
- Back up, share, and restore your config as a portable `.sfbackup` bundle — with individual file selection and automatic path rewriting across machines
- Switch the core UI language without editing config files (9 languages)
- Catch validation errors before they silently break your workflows

> Stop editing files by hand. Start shipping prompts faster.

---

## Features

| | Feature | Description |
|---|---|---|
| **Multi-CLI** | Claude, Codex, Gemini | Switch between CLI adapters from the sidebar — each with its own config dir, profiles, and views |
| **Dynamic Folders** | Browse any directory | Toggle visibility of any folder in your CLI config dir — full file browser with breadcrumb navigation, resizable split pane, line-numbered editing, and HTML preview |
| **Resource Views** | Dedicated editors | Agents, Skills, Commands, Hooks, Plans, Plugins, Sessions, Tasks, Teams, Todos — each with Markdown editor and context menus |
| **MCP Servers** | GUI management | Add, edit, enable/disable servers without touching JSON |
| **Profiles** | Config snapshots | Save and restore per-CLI configurations per project or client |
| **Settings** | Structured + raw JSON | Guided settings sections, direct JSON editing, and inline global instructions editor (CLAUDE.md / AGENTS.md) with Rich/Raw toggle |
| **Command Palette** | `Ctrl+K` | Fuzzy-search across all resource types instantly |
| **Backup & Restore** | Portable bundles | Full backup (tar.gz), selective Share & Export with individual file picking, and import with automatic path rewriting for cross-machine portability |
| **History & Diff** | Change review | See what changed before you overwrite anything |
| **Preferences** | App-level controls | Change theme, language, and custom config directory from one modal |
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
| Switch CLIs | Edit different config dirs | One-click CLI switcher in sidebar |
| Browse custom dirs | `ls ~/.claude/projects/` | Dynamic folder browser with editing |
| Switch configs | Manual copy/paste | One-click profile switch |
| MCP server setup | Edit `.mcp.json` by hand | GUI with form validation |
| Find a file | `ls ~/.claude/agents/` | `Ctrl+K` fuzzy search |
| Backup config | `cp -r ~/.claude ~/backup` | Full backup or selective Share & Export with per-file granularity |
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

**Recent product additions:** multi-CLI adapter support (Claude Code, Codex CLI, Gemini CLI), dynamic folder browser with resizable pane and file editing, configurable resource visibility, global instructions editor with Rich/Raw toggle, per-CLI profiles, HTML preview for web files, and full i18n coverage for new features.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE).
