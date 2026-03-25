# Getting Started

## Installation

### Download

Download the latest release for your platform:

| Platform | Format |
|----------|--------|
| Windows | `.msi` installer |
| macOS | `.dmg` universal (Intel + Apple Silicon) |
| Linux | `.AppImage` or `.deb` |

Visit the [Releases page](https://github.com/HayriCan/SkillForge/releases/latest) to download.

### Package Managers

```bash
# macOS (coming soon)
brew install cc-manager

# Windows (coming soon)
winget install cc-manager
```

## First Launch

When you open Skill Forge for the first time, the onboarding wizard will guide you through:

1. **Detecting your Claude Code installation** — Skill Forge automatically locates your `~/.claude/` directory.
2. **Scanning existing configuration** — All agents, skills, commands, hooks, and settings are indexed.
3. **Creating your first profile** — Optionally snapshot your current config as a named profile.

## The Interface

The main window is divided into three areas:

- **Sidebar** (left) — Lists all 12 resource types. Click a category or press `1`–`9` to switch views.
- **File List** (center) — Shows files in the selected category. Use the search bar or `Ctrl+K` for global search.
- **Editor** (right) — Edit the selected file with syntax highlighting, validation, and diff preview.

## Development Setup

If you want to build Skill Forge from source:

```bash
# Prerequisites: Node 20+, Rust stable
git clone https://github.com/HayriCan/SkillForge.git
cd SkillForge
npm install
npm run tauri dev
```

## Next Steps

- [Set up profiles](/guide/profiles) for different work contexts
- [Configure MCP servers](/guide/mcp-servers) through the GUI
- [Learn keyboard shortcuts](/reference/keyboard-shortcuts) for faster navigation
