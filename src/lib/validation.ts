/**
 * Validate a file name for safe filesystem usage.
 */
export function validateFileName(name: string): string | null {
  if (!name.trim()) return 'Name cannot be empty';
  if (name.length > 100) return 'Name too long (max 100 chars)';
  if (/[<>:"/\\|?*\x00-\x1f]/.test(name)) return 'Invalid characters in name';
  if (name.startsWith('.') || name.startsWith('-')) return 'Name cannot start with . or -';
  return null;
}

/**
 * Validate a JSON string.
 */
export function validateJson(text: string): string | null {
  try {
    JSON.parse(text);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid JSON';
  }
}

/**
 * Validate YAML frontmatter (basic key:value check).
 */
export function validateYamlFrontmatter(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const lines = match[1].split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
  for (const line of lines) {
    if (!line.includes(':')) return `Invalid YAML line: "${line}"`;
  }
  return null;
}

/**
 * Validate an MCP server name.
 */
export function validateServerName(name: string): string | null {
  if (!name.trim()) return 'Name cannot be empty';
  if (/\s/.test(name)) return 'Server name cannot contain spaces';
  if (!/^[a-z0-9_-]+$/.test(name)) return 'Only lowercase letters, numbers, - and _ allowed';
  return null;
}
