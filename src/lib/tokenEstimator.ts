import { claudeDir, readFile, listDirFull } from './fs';
import { loadMcpConfig } from './mcp';

export type TokenEstimate = {
  claudeMd: number;
  memoryMd: number;
  skills: number;
  skillCount: number;
  agents: number;
  agentCount: number;
  hooks: number;
  hookCount: number;
  mcp: number;
  mcpServerCount: number;
  total: number;
};

function charsToTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

async function countFilesInDir(dirPath: string): Promise<number> {
  try {
    const entries = await listDirFull(dirPath);
    let count = 0;
    for (const e of entries) {
      if (e.isDir) {
        count += await countFilesInDir(`${dirPath}/${e.name}`);
      } else {
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

async function totalCharsInDir(dirPath: string): Promise<number> {
  try {
    const entries = await listDirFull(dirPath);
    let total = 0;
    for (const e of entries) {
      const full = `${dirPath}/${e.name}`;
      if (e.isDir) {
        total += await totalCharsInDir(full);
      } else {
        try {
          const content = await readFile(full);
          total += content.length;
        } catch { /* skip unreadable */ }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

async function estimateTokensForPath(basePath: string): Promise<TokenEstimate> {
  let claudeMd = 0;
  try {
    const content = await readFile(`${basePath}/CLAUDE.md`);
    claudeMd = charsToTokens(content.length);
  } catch { /* file may not exist */ }

  let memoryMd = 0;
  try {
    const content = await readFile(`${basePath}/MEMORY.md`);
    memoryMd = charsToTokens(content.length);
  } catch { /* file may not exist */ }

  const skillCount = await countFilesInDir(`${basePath}/skills`);
  const skillChars = await totalCharsInDir(`${basePath}/skills`);
  const skills = charsToTokens(skillChars) + skillCount * 500;

  const agentCount = await countFilesInDir(`${basePath}/agents`);
  const agentChars = await totalCharsInDir(`${basePath}/agents`);
  const agents = charsToTokens(agentChars) + agentCount * 300;

  let hookCount = 0;
  try {
    const settingsRaw = await readFile(`${basePath}/settings.json`);
    const settings = JSON.parse(settingsRaw) as Record<string, unknown>;
    if (settings.hooks && typeof settings.hooks === 'object') {
      for (const entries of Object.values(settings.hooks as Record<string, unknown[]>)) {
        if (Array.isArray(entries)) hookCount += entries.length;
      }
    }
  } catch { /* no settings */ }
  const hooks = hookCount * 100;

  let mcpServerCount = 0;
  try {
    const mcpRaw = await readFile(`${basePath}/mcp-servers.json`);
    const mcpData = JSON.parse(mcpRaw) as { mcpServers?: Record<string, unknown> };
    mcpServerCount = Object.keys(mcpData.mcpServers ?? {}).length;
  } catch {
    try {
      const mcp = await loadMcpConfig();
      mcpServerCount = Object.keys(mcp.mcpServers).length;
    } catch { /* no mcp */ }
  }
  const mcp = mcpServerCount * 200;

  const total = claudeMd + memoryMd + skills + agents + hooks + mcp;

  return { claudeMd, memoryMd, skills, skillCount, agents, agentCount, hooks, hookCount, mcp, mcpServerCount, total };
}

/**
 * Estimate token usage for the current live ~/.claude/ state.
 */
export async function estimateCurrentTokens(): Promise<TokenEstimate> {
  const base = await claudeDir();
  return estimateTokensForPath(base);
}

/**
 * Estimate token usage for a named profile snapshot.
 */
export async function estimateProfileTokens(profileName: string): Promise<TokenEstimate> {
  const base = await claudeDir();
  return estimateTokensForPath(`${base}/profiles/${profileName}`);
}

/**
 * Format token count as readable string: "850", "1.2k", "15k".
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 10000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${Math.round(tokens / 1000)}k`;
}
