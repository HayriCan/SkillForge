import { readFile, listDirFull, claudeDir } from './fs';

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
  return Math.round(chars / 4);
}

async function totalCharsInDir(dir: string): Promise<number> {
  let total = 0;
  try {
    const entries = await listDirFull(dir);
    for (const entry of entries) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDir) {
        total += await totalCharsInDir(path);
      } else {
        try {
          const content = await readFile(path);
          total += content.length;
        } catch {}
      }
    }
  } catch {}
  return total;
}

async function countFilesInDir(dir: string): Promise<number> {
  let count = 0;
  try {
    const entries = await listDirFull(dir);
    for (const entry of entries) {
      if (entry.isDir) {
        count += await countFilesInDir(`${dir}/${entry.name}`);
      } else {
        count++;
      }
    }
  } catch {}
  return count;
}

async function estimateFromDir(baseDir: string): Promise<TokenEstimate> {
  // CLAUDE.md
  let claudeMdChars = 0;
  try { claudeMdChars = (await readFile(`${baseDir}/CLAUDE.md`)).length; } catch {}
  const claudeMd = charsToTokens(claudeMdChars);

  // MEMORY.md
  let memoryMdChars = 0;
  try { memoryMdChars = (await readFile(`${baseDir}/MEMORY.md`)).length; } catch {}
  const memoryMd = charsToTokens(memoryMdChars);

  // Skills
  const skillCount = await countFilesInDir(`${baseDir}/skills`);
  const skillChars = await totalCharsInDir(`${baseDir}/skills`);
  const skills = charsToTokens(skillChars) + skillCount * 500;

  // Agents
  const agentCount = await countFilesInDir(`${baseDir}/agents`);
  const agentChars = await totalCharsInDir(`${baseDir}/agents`);
  const agents = charsToTokens(agentChars) + agentCount * 300;

  // Hooks — count entries from settings.json
  let hookCount = 0;
  try {
    const settingsRaw = await readFile(`${baseDir}/settings.json`);
    const settings = JSON.parse(settingsRaw) as Record<string, unknown>;
    const hooksObj = settings.hooks as Record<string, unknown[]> | undefined;
    if (hooksObj && typeof hooksObj === 'object') {
      hookCount = Object.values(hooksObj).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    }
  } catch {}
  const hooks = hookCount * 100;

  // MCP servers
  let mcpServerCount = 0;
  try {
    const mcpRaw = await readFile(`${baseDir}/mcp-servers.json`);
    const mcp = JSON.parse(mcpRaw) as { mcpServers?: Record<string, unknown> };
    mcpServerCount = mcp.mcpServers ? Object.keys(mcp.mcpServers).length : 0;
  } catch {}
  const mcp = mcpServerCount * 200;

  const total = claudeMd + memoryMd + skills + agents + hooks + mcp;

  return { claudeMd, memoryMd, skills, skillCount, agents, agentCount, hooks, hookCount, mcp, mcpServerCount, total };
}

/**
 * Estimate token usage from the live ~/.claude/ directory.
 */
export async function estimateCurrentTokens(): Promise<TokenEstimate> {
  const base = await claudeDir();
  return estimateFromDir(base);
}

/**
 * Estimate token usage from a saved profile snapshot directory.
 */
export async function estimateProfileTokens(profileName: string): Promise<TokenEstimate> {
  const base = await claudeDir();
  const profileDir = `${base}/profiles/${profileName}`;
  return estimateFromDir(profileDir);
}

/**
 * Format a token count as a human-readable string: "1.2k", "15k", "850", etc.
 */
export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
