import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

export type McpStatus = 'connected' | 'needs-auth' | 'failed' | 'unknown';

export type McpCategory = 'local' | 'user' | 'cloud' | 'builtin';

export type LiveMcpEntry = {
  name: string;
  url: string;
  transport?: string;
  status: McpStatus;
  category: McpCategory;
};

/** Parse a single line from `claude mcp list` output */
function parseLine(line: string): LiveMcpEntry | null {
  // Format: "Name: <cmd-or-url> [(TRANSPORT)] - <status>"
  // The separator between endpoint and status is " - " but endpoint may contain spaces.
  // We split on the last occurrence of " - " to isolate the status.
  const dashIdx = line.lastIndexOf(' - ');
  if (dashIdx === -1) return null;

  const left = line.slice(0, dashIdx);
  const statusRaw = line.slice(dashIdx + 3).trim();

  const colonIdx = left.indexOf(':');
  if (colonIdx === -1) return null;

  const name = left.slice(0, colonIdx).trim();
  if (!name) return null;

  const rest = left.slice(colonIdx + 1).trim();
  // Check for trailing "(TRANSPORT)" on the endpoint
  const transportMatch = rest.match(/^(.*?)\s+\((\w+)\)$/);
  const url = transportMatch ? transportMatch[1].trim() : rest;
  const transport = transportMatch ? transportMatch[2] : undefined;

  const status = parseStatus(statusRaw);
  const category = categorize(name);

  return { name, url, transport, status, category };
}

function parseStatus(raw: string): McpStatus {
  const lower = raw.toLowerCase();
  if (lower.includes('connected')) return 'connected';
  if (lower.includes('authentication') || lower.includes('auth')) return 'needs-auth';
  if (lower.includes('failed') || lower.includes('error') || lower.includes('✗')) return 'failed';
  return 'unknown';
}

function categorize(name: string): McpCategory {
  if (name.startsWith('claude.ai')) return 'cloud';
  if (name.startsWith('plugin:')) return 'builtin';
  return 'user';
}

/**
 * Run `claude mcp list` via Tauri command and return parsed entries with live status.
 */
export async function listMcpServersLive(): Promise<LiveMcpEntry[]> {
  const stdout = await invoke<string>('run_claude_mcp_list');
  const lines = stdout.split('\n');
  return lines.map(parseLine).filter((e): e is LiveMcpEntry => e !== null);
}

/**
 * Open the OAuth / authentication URL for a server that needs auth.
 * For claude.ai integrations, opens Claude settings page.
 * For plugin-based MCPs, Claude handles auth — we open the server base URL.
 */
export async function authenticateMcp(entry: LiveMcpEntry): Promise<void> {
  if (entry.category === 'cloud') {
    await openUrl('https://claude.ai/settings/integrations');
  } else {
    // Try opening the server's base URL for OAuth handshake
    const base = new URL(entry.url).origin;
    await openUrl(base);
  }
}
