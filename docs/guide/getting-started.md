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

### Auto-Updates

Official GitHub release builds check for published updates on startup. You can also run **Check for Updates** from the app menu to open the manual install flow.

If an update is available, Skill Forge downloads it, installs it in place, and then prompts for a restart to finish the upgrade.

Source builds are best-effort only. Draft GitHub releases do not appear to the updater until they are published, and some Linux package formats may still need manual upgrades.

### Package Managers

```bash
# macOS (coming soon)
brew install skill-forge

# Windows (coming soon)
winget install skill-forge
```

## First Launch

When you open Skill Forge for the first time, the onboarding wizard will guide you through:

1. **Detecting your Claude Code installation** — Skill Forge automatically locates your `~/.claude/` directory.
2. **Scanning existing configuration** — All agents, skills, commands, hooks, and settings are indexed.
3. **Creating your first profile** — Optionally snapshot your current config as a named profile.

### Platform Notes

- Windows works best when Skill Forge is installed from the official release packages.
- macOS can still show Gatekeeper or notarization prompts after an update relaunch; use **Open Anyway** or `xattr -cr` if required.
- Linux package behavior can vary between `.AppImage` and `.deb`, so some installs may still need a manual upgrade path.

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
