# MCP Servers

Skill Forge provides a visual interface for managing Model Context Protocol (MCP) server configurations, so you never need to edit `.mcp.json` by hand.

## Viewing MCP Servers

Open the **Settings** view and navigate to the MCP Servers section. You'll see a list of all configured servers with their:

- Name and transport type
- Connection status
- Enabled/disabled state

## Adding a Server

1. Click **Add MCP Server**.
2. Fill in the server details:
   - **Name** — A display name for the server.
   - **Transport** — `stdio` or `sse`.
   - **Command / URL** — The command to run (for stdio) or the endpoint URL (for SSE).
   - **Arguments** — Any command-line arguments.
   - **Environment variables** — Key-value pairs passed to the server process.
3. Click **Save**.

Skill Forge writes the configuration to your `.mcp.json` file in the correct format.

## Editing a Server

Click any server in the list to open its configuration form. Make changes and click **Save**. A diff preview shows exactly what will change in the underlying JSON.

## Toggling Servers

Use the toggle switch next to any server to enable or disable it without removing its configuration. Disabled servers remain in your config but are not loaded by Claude Code.

## Removing a Server

Click the delete button next to a server and confirm. The server entry is removed from `.mcp.json`.
