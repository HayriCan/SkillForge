# Changelog

All notable changes to Skill Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2026-04-06

### Added
- **Unified Resource View** — single configuration-driven component replaces 7 separate views (Agents, Commands, Plans, Skills, Hooks, FolderView, MarkdownCrud); supports markdown/HTML/code/binary rendering, version history, bulk delete, breadcrumb navigation, and resizable split pane
- **AI-powered file editing** — ask Claude Code, Codex, or Gemini to edit any open file directly from the editor; changes shown as diff before saving (`Ctrl+Enter` to submit)
- **Skill Creator Wizard** — 5-step guided skill creation with template selection (simple, pattern, checklist, workflow), trigger configuration, and content preview
- **Insights Dashboard** — skill usage analytics from `history.jsonl` and plugin cache; sortable skill table, plugin breakdown, and on-demand scan via `claude /insights`
- **Resource config system** — `ResourceConfig` type and registry for declarative resource management; supports custom `onAfterDelete`/`onAfterCreate` callbacks and wizard enablement per resource

### Changed
- Window default size increased to 1280×820 (minimum 800×560) for better content density
- Auto-select newly created files in the editor immediately after creation
- `create_full_backup` is now cross-platform — uses `date -r` on macOS, `date -d` on Linux

### Fixed
- AI panel no longer appears on binary files (images, PDFs, etc.) — only shown for text files
- Error handling added to Sessions, Teams, Todos, and Tasks views (previously silent failures)
- `read_plugin_file` hardened against absolute path and symlink-based path traversal attacks
- CSP set to restrictive policy (was `null`) — reduces XSS attack surface in production builds

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
