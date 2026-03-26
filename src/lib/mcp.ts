import { readFile, writeFile, claudeDir } from './fs';
import { homeDir } from '@tauri-apps/api/path';
import { getActiveAdapter } from './adapters/index';

export type McpServerType = 'stdio' | 'sse' | 'http';

export type McpServer = {
  type: McpServerType;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  disabled?: boolean;
};

export type McpConfig = {
  mcpServers: Record<string, McpServer>;
};

/** Where a server is stored */
export type McpScope = 'user' | 'project';

export type ScopedMcpEntry = {
  name: string;
  server: McpServer;
  scope: McpScope;
  /** Absolute project path for project-scoped entries */
  projectPath?: string;
};

/**
 * Returns the path of the primary MCP config file for the active CLI adapter.
 * Claude Code: ~/.claude.json
 * Gemini CLI:  ~/.gemini/settings.json
 * Codex CLI:   null (MCP not supported — callers should check adapter.supportsMcp)
 */
async function claudeJsonPath(): Promise<string> {
  const home = await homeDir();
  const h = home.endsWith('/') ? home.slice(0, -1) : home;
  const adapter = await getActiveAdapter();
  if (!adapter.mcpConfigFile) {
    // Return a non-existent path so reads gracefully fail and writes are no-ops
    return `${h}/${adapter.configDirName}/.no-mcp`;
  }
  return `${h}/${adapter.mcpConfigFile}`;
}

/**
 * Read mcpServers from a JSON file, returning empty object if missing/invalid.
 */
async function readMcpServersFrom(path: string): Promise<McpConfig['mcpServers']> {
  try {
    const raw = await readFile(path);
    const data = JSON.parse(raw) as Record<string, unknown>;
    return (data.mcpServers as McpConfig['mcpServers']) ?? {};
  } catch {
    return {};
  }
}

/**
 * Load MCP servers from all known config locations and merge them.
 * Sources (in priority order, later entries override earlier):
 *   1. ~/.claude/settings.json
 *   2. ~/.claude/settings.local.json
 *   3. ~/.claude.json  (primary — user-level)
 */
export async function loadMcpConfig(): Promise<McpConfig> {
  const [base, claudeJson] = await Promise.all([claudeDir(), claudeJsonPath()]);

  const [fromSettings, fromLocal, fromClaudeJson] = await Promise.all([
    readMcpServersFrom(`${base}/settings.json`),
    readMcpServersFrom(`${base}/settings.local.json`),
    readMcpServersFrom(claudeJson),
  ]);

  return {
    mcpServers: { ...fromSettings, ...fromLocal, ...fromClaudeJson },
  };
}

/**
 * Save MCP servers back to ~/.claude.json (user-level primary config).
 * Only updates the mcpServers key, preserving all other data.
 */
export async function saveMcpConfig(config: McpConfig): Promise<void> {
  const path = await claudeJsonPath();
  let data: Record<string, unknown> = {};
  try {
    const raw = await readFile(path);
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {}
  data.mcpServers = config.mcpServers;
  await writeFile(path, JSON.stringify(data, null, 2));
}


/**
 * Load all MCP servers across user-level and all project scopes from ~/.claude.json.
 * Returns entries tagged with their scope and project path.
 */
export async function loadAllMcpEntries(): Promise<ScopedMcpEntry[]> {
  const filePath = await claudeJsonPath();
  try {
    const raw = await readFile(filePath);
    const data = JSON.parse(raw) as Record<string, unknown>;

    const results: ScopedMcpEntry[] = [];

    // User-level
    const userServers = (data.mcpServers ?? {}) as Record<string, McpServer>;
    for (const [name, server] of Object.entries(userServers)) {
      results.push({ name, server, scope: 'user' });
    }

    // Project-level
    const projects = (data.projects ?? {}) as Record<string, Record<string, unknown>>;
    for (const [projectPath, project] of Object.entries(projects)) {
      const projectServers = (project.mcpServers ?? {}) as Record<string, McpServer>;
      for (const [name, server] of Object.entries(projectServers)) {
        results.push({ name, server, scope: 'project', projectPath });
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Save a server to a specific scope. User-level goes to top-level mcpServers;
 * project-level goes to projects[projectPath].mcpServers.
 */
export async function saveScopedMcpServer(
  name: string,
  server: McpServer,
  scope: McpScope,
  projectPath?: string,
): Promise<void> {
  const filePath = await claudeJsonPath();
  let data: Record<string, unknown> = {};
  try {
    const raw = await readFile(filePath);
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {}

  if (scope === 'user') {
    const servers = (data.mcpServers ?? {}) as Record<string, McpServer>;
    servers[name] = server;
    data.mcpServers = servers;
  } else if (projectPath) {
    const projects = (data.projects ?? {}) as Record<string, Record<string, unknown>>;
    if (!projects[projectPath]) projects[projectPath] = {};
    const servers = (projects[projectPath].mcpServers ?? {}) as Record<string, McpServer>;
    servers[name] = server;
    projects[projectPath].mcpServers = servers;
    data.projects = projects;
  }

  await writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Remove a server from its scope.
 */
export async function removeScopedMcpServer(
  name: string,
  scope: McpScope,
  projectPath?: string,
): Promise<void> {
  const filePath = await claudeJsonPath();
  let data: Record<string, unknown> = {};
  try {
    const raw = await readFile(filePath);
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {}

  if (scope === 'user') {
    const servers = (data.mcpServers ?? {}) as Record<string, McpServer>;
    delete servers[name];
    data.mcpServers = servers;
  } else if (projectPath) {
    const projects = (data.projects ?? {}) as Record<string, Record<string, unknown>>;
    if (projects[projectPath]?.mcpServers) {
      delete (projects[projectPath].mcpServers as Record<string, McpServer>)[name];
      data.projects = projects;
    }
  }

  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function addMcpServer(name: string, server: McpServer): Promise<void> {
  const config = await loadMcpConfig();
  config.mcpServers[name] = server;
  await saveMcpConfig(config);
}

export async function removeMcpServer(name: string): Promise<void> {
  const config = await loadMcpConfig();
  delete config.mcpServers[name];
  await saveMcpConfig(config);
}

export async function updateMcpServer(name: string, server: McpServer): Promise<void> {
  const config = await loadMcpConfig();
  config.mcpServers[name] = server;
  await saveMcpConfig(config);
}

export async function toggleMcpServer(
  name: string,
  scope: McpScope = 'user',
  projectPath?: string,
): Promise<void> {
  const filePath = await claudeJsonPath();
  let data: Record<string, unknown> = {};
  try {
    const raw = await readFile(filePath);
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {}

  let server: McpServer | undefined;
  if (scope === 'user') {
    const servers = (data.mcpServers ?? {}) as Record<string, McpServer>;
    server = servers[name];
    if (server) {
      server.disabled = !server.disabled;
      data.mcpServers = servers;
    }
  } else if (projectPath) {
    const projects = (data.projects ?? {}) as Record<string, Record<string, unknown>>;
    const servers = (projects[projectPath]?.mcpServers ?? {}) as Record<string, McpServer>;
    server = servers[name];
    if (server) {
      server.disabled = !server.disabled;
      servers[name] = server;
      projects[projectPath].mcpServers = servers;
      data.projects = projects;
    }
  }

  if (server) {
    await writeFile(filePath, JSON.stringify(data, null, 2));
  }
}

export type ProjectTrustEntry = {
  path: string;
  name: string;
  trusted: boolean;
};

export async function loadProjectTrust(): Promise<ProjectTrustEntry[]> {
  try {
    const raw = await readFile(await claudeJsonPath());
    const data = JSON.parse(raw) as Record<string, unknown>;
    const projects = (data.projects ?? {}) as Record<string, Record<string, unknown>>;
    return Object.entries(projects)
      .filter(([, p]) => typeof p === 'object' && p !== null)
      .map(([path, p]) => ({
        path,
        name: path.split('/').pop() ?? path,
        trusted: (p.hasTrustDialogAccepted as boolean) ?? false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function setProjectTrust(projectPath: string, trusted: boolean): Promise<void> {
  const filePath = await claudeJsonPath();
  const raw = await readFile(filePath);
  const data = JSON.parse(raw) as Record<string, unknown>;
  const projects = (data.projects ?? {}) as Record<string, Record<string, unknown>>;
  if (projects[projectPath]) {
    projects[projectPath].hasTrustDialogAccepted = trusted;
  } else {
    projects[projectPath] = { hasTrustDialogAccepted: trusted };
  }
  data.projects = projects;
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function trustAllProjects(): Promise<void> {
  const filePath = await claudeJsonPath();
  const raw = await readFile(filePath);
  const data = JSON.parse(raw) as Record<string, unknown>;
  const projects = (data.projects ?? {}) as Record<string, Record<string, unknown>>;
  for (const key of Object.keys(projects)) {
    projects[key].hasTrustDialogAccepted = true;
  }
  data.projects = projects;
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

/** Popular MCP server presets for quick setup */
export const MCP_PRESETS: { name: string; label: string; server: McpServer }[] = [
  {
    name: 'filesystem',
    label: 'Filesystem',
    server: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'] },
  },
  {
    name: 'github',
    label: 'GitHub',
    server: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' } },
  },
  {
    name: 'brave-search',
    label: 'Brave Search',
    server: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'], env: { BRAVE_API_KEY: '' } },
  },
  {
    name: 'sequential-thinking',
    label: 'Sequential Thinking',
    server: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'] },
  },
];
