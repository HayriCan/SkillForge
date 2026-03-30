# Backup & Restore

Skill Forge lets you export and import your entire `~/.claude/` configuration as a portable bundle.

## Creating a Backup

1. Open the command palette with `Ctrl+K` and search for "Backup", or navigate to **Settings > Backup**.
2. Click **Create Backup**.
3. Choose a destination for the `.sfbackup` file.
4. Skill Forge packages all your configuration files into a single archive.

The backup includes:

- All agents, skills, and commands
- Hook definitions
- MCP server configurations (`mcp.json`)
- Settings (`settings.json`)
- CLAUDE.md and MEMORY.md files
- Profile snapshots

## Restoring from a Backup

1. Open the command palette with `Ctrl+K` and search for "Restore".
2. Select a `.sfbackup` file.
3. Review the list of files that will be restored.
4. Confirm to apply.

Your current configuration is automatically backed up before the restore operation, so you can always undo.

## Backup Format

The `.sfbackup` format is a standard ZIP archive with a metadata manifest. You can inspect its contents with any ZIP tool if needed.

## Automating Backups

Skill Forge does not currently support scheduled backups, but you can use the command palette to create backups before making significant configuration changes.
