import { readFile, writeFile, listDirFull, ensureDir, claudeDir } from './fs';
import { homeDir } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { getActiveAdapter } from './adapters/index';

export type BackupFile = {
  relativePath: string;
  content: string;
};

export type BackupBundle = {
  version: '1';
  createdAt: string;
  claudeDir: string;
  homeDir?: string;
  files: BackupFile[];
};

export type ExportFileInfo = {
  name: string;
  relativePath: string;
};

export type ExportCategory = {
  id: string;
  label: string;
  description: string;
  fileCount: number;
  files: ExportFileInfo[];
};

const CATEGORY_LABELS: Record<string, string> = {
  agents: 'Agents',
  skills: 'Skills',
  hooks: 'Hooks',
  commands: 'Commands',
  plans: 'Plans',
  todos: 'Todos',
  memories: 'Memory',
  memory: 'Memory',
  teams: 'Teams',
  __root__: 'Config Files',
  __home__: 'MCP Config',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  agents: 'Custom AI agent definitions',
  skills: 'Reusable skill scripts',
  hooks: 'Event-driven automation hooks',
  commands: 'Custom slash commands',
  plans: 'Saved execution plans',
  todos: 'Task and todo lists',
  memories: 'Persistent memory files',
  memory: 'Persistent memory files',
  teams: 'Team configurations',
  __root__: 'Root-level config files (settings, instructions)',
  __home__: 'MCP config file (home directory)',
};

// Only skip ephemeral, cache, or re-installable directories.
// Keep user-created content: agents, skills, commands, hooks, plans, memories.
const SKIP_DIRS = new Set([
  'sessions',       // conversation history — ephemeral
  'cache',          // internal cache
  'node_modules',   // dependencies
  '.git',           // git data
  'profiles',       // handled separately by profile system
  'projects',       // per-project session/task data — 100s of MB, ephemeral
  'debug',          // debug logs
  'telemetry',      // usage telemetry
  // 'plugins' intentionally NOT skipped — plugin configs should be backed up
  'file-history',   // editor undo history — ephemeral
  'session-env',    // environment snapshots — ephemeral
  'paste-cache',    // clipboard cache
  'image-cache',    // image cache
  'usage-data',     // usage statistics
  'shell-snapshots',// shell state snapshots
  'backups',        // avoid recursive backup inclusion
]);

// Well-known capability directories — shown first in the list when they exist on disk.
const KNOWN_CAPABILITY_DIRS = ['agents', 'commands', 'hooks', 'plugins', 'skills', 'teams'];

/**
 * Count readable text files directly in a directory (non-recursive).
 * Returns 0 if the directory doesn't exist.
 */
async function countFiles(dir: string, recursive = false): Promise<number> {
  const files: BackupFile[] = [];
  try {
    if (recursive) {
      await collectFiles(dir, dir, files);
    } else {
      const entries = await listDirFull(dir);
      for (const e of entries) {
        if (!e.isDir && e.name) {
          try { await readFile(`${dir}/${e.name}`); files.push({ relativePath: e.name, content: '' }); } catch {}
        }
      }
    }
  } catch { /* dir doesn't exist */ }
  return files.length;
}

/**
 * Return categories for the export UI.
 * Known capability dirs are always listed (even with 0 files).
 * Root-level config files and MCP config (if applicable) are also included.
 * Any other top-level dirs discovered are appended at the end.
 */
export async function listExportCategories(): Promise<ExportCategory[]> {
  const base = await claudeDir();
  const home = await homeDir();
  const homePath = home.endsWith('/') ? home.slice(0, -1) : home;

  const categories: ExportCategory[] = [];
  const seen = new Set<string>();

  // Fast scan: only list file paths, don't read contents
  const allPaths: string[] = [];
  await scanFilePaths(base, base, allPaths);

  // Group files by top-level directory
  const filesByCategory = new Map<string, ExportFileInfo[]>();

  for (const rel of allPaths) {
    const sep = rel.indexOf('/');
    const segment = sep === -1 ? '__root__' : rel.slice(0, sep);
    const nameInCategory = sep === -1 ? rel : rel.slice(sep + 1);
    if (!filesByCategory.has(segment)) filesByCategory.set(segment, []);
    filesByCategory.get(segment)!.push({ name: nameInCategory, relativePath: rel });
  }

  // Known capability dirs — shown first but only if they have files
  for (const id of KNOWN_CAPABILITY_DIRS) {
    const files = filesByCategory.get(id);
    if (!files || files.length === 0) continue;
    categories.push({
      id,
      label: CATEGORY_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1),
      description: CATEGORY_DESCRIPTIONS[id] ?? '',
      fileCount: files.length,
      files,
    });
    seen.add(id);
  }

  // Root-level config files
  const rootFiles = filesByCategory.get('__root__') ?? [];
  if (rootFiles.length > 0) {
    categories.push({
      id: '__root__',
      label: CATEGORY_LABELS['__root__'],
      description: CATEGORY_DESCRIPTIONS['__root__'],
      fileCount: rootFiles.length,
      files: rootFiles,
    });
    seen.add('__root__');
  }

  // Dynamically discovered dirs not in the known list
  for (const [id, files] of filesByCategory) {
    if (seen.has(id)) continue;
    categories.push({
      id,
      label: CATEGORY_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1),
      description: CATEGORY_DESCRIPTIONS[id] ?? '',
      fileCount: files.length,
      files,
    });
  }

  // MCP config file (adapter-aware, e.g. ~/.claude.json or inside config dir)
  const adapter = await getActiveAdapter();
  if (adapter.mcpConfigFile && !adapter.mcpConfigFile.includes('/')) {
    // Top-level MCP config (e.g. .claude.json in home dir)
    try {
      await readFile(`${homePath}/${adapter.mcpConfigFile}`);
      categories.push({
        id: '__home__',
        label: CATEGORY_LABELS['__home__'],
        description: CATEGORY_DESCRIPTIONS['__home__'],
        fileCount: 1,
        files: [{ name: adapter.mcpConfigFile, relativePath: `__home__/${adapter.mcpConfigFile}` }],
      });
    } catch { /* not present */ }
  }

  return categories;
}

/**
 * Recursively scan file paths without reading contents (fast, for UI listing).
 */
async function scanFilePaths(dir: string, base: string, paths: string[]): Promise<void> {
  let entries: { name: string; isDir: boolean }[];
  try {
    entries = await listDirFull(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.name) continue;
    const fullPath = `${dir}/${e.name}`;
    const rel = fullPath.slice(base.length + 1);
    if (e.isDir) {
      if (SKIP_DIRS.has(e.name)) continue;
      await scanFilePaths(fullPath, base, paths);
    } else {
      paths.push(rel);
    }
  }
}

/**
 * Recursively collect text files from a directory into flat list (reads content).
 */
async function collectFiles(dir: string, base: string, files: BackupFile[]): Promise<void> {
  let entries: { name: string; isDir: boolean }[];
  try {
    entries = await listDirFull(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.name) continue;
    const fullPath = `${dir}/${e.name}`;
    const rel = fullPath.slice(base.length + 1);
    if (e.isDir) {
      if (SKIP_DIRS.has(e.name)) continue;
      await collectFiles(fullPath, base, files);
    } else {
      try {
        const content = await readFile(fullPath);
        files.push({ relativePath: rel, content });
      } catch { /* skip unreadable */ }
    }
  }
}

/**
 * Export .claude directory as a JSON bundle.
 * selectedCategories: category IDs to include (e.g. 'agents', '__root__', '__home__').
 * selectedFiles: specific relative paths to include (for individual file export).
 * If both are omitted, exports everything.
 * Returns the path of the exported file.
 */
export async function exportBackup(
  selectedCategories?: string[],
  selectedFiles?: string[],
): Promise<string> {
  const base = await claudeDir();
  const home = await homeDir();
  const homePath = home.endsWith('/') ? home.slice(0, -1) : home;

  const files: BackupFile[] = [];
  const catSet = new Set(selectedCategories ?? []);
  const fileSet = new Set(selectedFiles ?? []);
  const all = catSet.size === 0 && fileSet.size === 0;

  const allFiles: BackupFile[] = [];
  await collectFiles(base, base, allFiles);

  for (const f of allFiles) {
    if (all) {
      files.push(f);
      continue;
    }
    // Check individual file selection
    if (fileSet.has(f.relativePath)) {
      files.push(f);
      continue;
    }
    // Check category selection
    const sep = f.relativePath.indexOf('/');
    const segment = sep === -1 ? '__root__' : f.relativePath.slice(0, sep);
    if (catSet.has(segment)) {
      files.push(f);
    }
  }

  // MCP config file (adapter-aware)
  const adapter = await getActiveAdapter();
  if (adapter.mcpConfigFile && !adapter.mcpConfigFile.includes('/')) {
    const mcpRelPath = `__home__/${adapter.mcpConfigFile}`;
    if (all || catSet.has('__home__') || fileSet.has(mcpRelPath)) {
      try {
        const mcpJson = await readFile(`${homePath}/${adapter.mcpConfigFile}`);
        files.push({ relativePath: mcpRelPath, content: mcpJson });
      } catch {}
    }
  }

  const bundle: BackupBundle = {
    version: '1',
    createdAt: new Date().toISOString(),
    claudeDir: base,
    homeDir: homePath,
    files,
  };

  const date = new Date().toISOString().slice(0, 10);
  const filename = `skill-forge-backup-${date}.sfbackup`;
  const outPath = `${home}/${filename}`;
  await writeFile(outPath, JSON.stringify(bundle, null, 2));
  return outPath;
}

/**
 * Import a backup bundle from the given file path.
 * mode: 'merge' keeps existing files not in the backup; 'overwrite' replaces all.
 * onProgress is called after each file with (current, total).
 */
export async function importBackup(
  bundlePath: string,
  mode: 'merge' | 'overwrite' = 'merge',
  onProgress?: (current: number, total: number) => void,
): Promise<{ restored: number; skipped: number }> {
  const raw = await readFile(bundlePath);
  const bundle = JSON.parse(raw) as BackupBundle;

  if (bundle.version !== '1') {
    throw new Error(`Unsupported backup version: ${bundle.version}`);
  }

  const base = await claudeDir();
  const home = await homeDir();
  const homePath = home.endsWith('/') ? home.slice(0, -1) : home;

  // Build path rewriting rules from bundle metadata → current system paths
  const rewrites: Array<[string, string]> = [];
  if (bundle.claudeDir && bundle.claudeDir !== base) {
    rewrites.push([bundle.claudeDir, base]);
  }
  if (bundle.homeDir && bundle.homeDir !== homePath) {
    rewrites.push([bundle.homeDir, homePath]);
  }

  let restored = 0;
  let skipped = 0;
  const total = bundle.files.length;

  for (const file of bundle.files) {
    try {
      // Rewrite paths in file contents if source and target systems differ
      let content = file.content;
      for (const [oldPath, newPath] of rewrites) {
        content = content.replaceAll(oldPath, newPath);
      }

      // __home__/.claude.json is stored in home dir, not inside ~/.claude/
      const targetPath = file.relativePath.startsWith('__home__/')
        ? `${homePath}/${file.relativePath.slice('__home__/'.length)}`
        : `${base}/${file.relativePath}`;
      const dir = targetPath.substring(0, targetPath.lastIndexOf('/'));
      await ensureDir(dir);
      await writeFile(targetPath, content);
      restored++;
    } catch {
      skipped++;
    }
    onProgress?.(restored + skipped, total);
    // yield to the event loop so the UI can re-render between files
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return { restored, skipped };
}

/**
 * Create a full tar.gz backup of the active CLI's config directory.
 * Uses a Rust IPC command that calls system `tar`.
 * Returns { path, sizeBytes } on success.
 */
export async function createFullBackup(): Promise<{ path: string; sizeBytes: number }> {
  const adapter = await getActiveAdapter();
  const result = await invoke<string>('create_full_backup', {
    configDirName: adapter.configDirName,
    mcpConfigFile: adapter.mcpConfigFile && !adapter.mcpConfigFile.includes('/')
      ? adapter.mcpConfigFile
      : null,
  });
  const [path, sizeStr] = result.split('|');
  return { path, sizeBytes: parseInt(sizeStr, 10) || 0 };
}
