# Profiles

Profiles let you save and restore complete snapshots of your `~/.claude/` configuration. Switch between work, personal, and client-specific setups with a single click.

## What is a Profile?

A profile is a named snapshot of your entire Claude Code configuration, including:

- Agents, skills, and commands
- Hook definitions
- MCP server configurations
- Settings and preferences
- CLAUDE.md files

## Creating a Profile

1. Open the **Profiles** view from the sidebar.
2. Click **New Profile**.
3. Give it a name (e.g., "Work", "Personal", "Client-X").
4. Skill Forge snapshots your current `~/.claude/` directory.

## Switching Profiles

1. Open the **Profiles** view.
2. Click the profile you want to activate.
3. Skill Forge replaces your current config with the selected profile's snapshot.

A confirmation dialog shows you which files will change before applying.

## Editing a Profile

You can update a profile at any time:

- **Update** — Overwrite the profile with your current configuration.
- **Rename** — Change the profile's display name.
- **Delete** — Remove the profile snapshot permanently.

## How It Works

Profiles are stored as compressed archives inside Skill Forge's data directory. When you switch profiles:

1. Your current config is backed up automatically.
2. The selected profile is extracted to `~/.claude/`.
3. A history entry is created so you can undo the switch.
