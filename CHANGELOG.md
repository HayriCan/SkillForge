# Changelog

All notable changes to Skill Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-03-25

### Added
- App-level preferences modal for custom Claude directory selection and quick access actions
- Localization infrastructure with translatable navigation and settings labels
- Raw editing modes for settings JSON and skill content
- Signed updater configuration in the GitHub release workflow and Tauri updater setup

### Changed
- Refined the shell with a lighter visual system, updated sidebar/menu interactions, and improved empty states
- Improved backup import/export UX with clearer file selection, progress, and restore status feedback
- Hardened settings handling for app config paths, hook cleanup, and manual update checks

## [0.1.0] - 2026-03-23

### Added
- 12 resource views: Agents, Skills, Commands, Hooks, Plans, Plugins, Sessions, Tasks, Teams, Todos, Config, Settings
- Block-based Markdown editor with syntax highlighting (Shiki)
- Toast notification system (stackable, auto-dismiss)
- Global search / Command Palette (`Ctrl+K`)
- Keyboard shortcuts (`Ctrl+S`, `Ctrl+N`, `1–9` view switching)
- Onboarding wizard for first-time setup
- Error boundaries and empty states across all views
- Profile / Workspace switching (`~/.claude/profiles/`)
- MCP Server GUI — visual management of `.mcp.json`
- Backup & Restore — `.ccmbackup` portable bundle format
- Diff preview and version history before saving
- Light / Dark / Auto theme with system preference detection
- Inline validation: file names, JSON, YAML frontmatter
- Accessibility: ARIA labels, focus management, font size (`Ctrl+=`/`Ctrl+-`)
- Auto-updater with in-app update notification
- CI/CD pipeline with GitHub Actions (Windows, macOS, Linux)
