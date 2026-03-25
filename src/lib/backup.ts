import { readFile, writeFile, listDirFull, ensureDir, claudeDir } from './fs';
import { homeDir } from '@tauri-apps/api/path';

export type BackupFile = {
  relativePath: string;
  content: string;
};

export type BackupBundle = {
  version: '1';
  createdAt: string;
  claudeDir: string;
  files: BackupFile[];
};

export type ExportCategory = {
  id: string;
  label: string;
  description: string;
  fileCount: number;
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
  __root__: 'settings.json, settings.local.json, CLAUDE.md — includes hooks event mappings and MCP server config',
  __home__: '~/.claude.json — MCP project-level config',
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

// Well-known capability directories — always shown even if currently empty.
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
 * Root-level config files and ~/.claude.json are also included.
 * Any other top-level dirs discovered are appended at the end.
 */
export async function listExportCategories(): Promise<ExportCategory[]> {
  const base = await claudeDir();
  const home = await homeDir();
  const homePath = home.endsWith('/') ? home.slice(0, -1) : home;

  const categories: ExportCategory[] = [];
  const seen = new Set<string>();

  // Always-present capability dirs (with live file count)
  for (const id of KNOWN_CAPABILITY_DIRS) {
    const count = await countFiles(`${base}/${id}`, true);
    categories.push({
      id,
      label: CATEGORY_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1),
      description: CATEGORY_DESCRIPTIONS[id] ?? '',
      fileCount: count,
    });
    seen.add(id);
  }

  // Root-level config files
  const allFiles: BackupFile[] = [];
  await collectFiles(base, base, allFiles);
  const rootCount = allFiles.filter(f => !f.relativePath.includes('/')).length;
  if (rootCount > 0) {
    categories.push({
      id: '__root__',
      label: CATEGORY_LABELS['__root__'],
      description: CATEGORY_DESCRIPTIONS['__root__'],
      fileCount: rootCount,
    });
    seen.add('__root__');
  }

  // Dynamically discovered dirs not in the known list
  const counts: Record<string, number> = {};
  for (const f of allFiles) {
    const sep = f.relativePath.indexOf('/');
    if (sep === -1) continue; // root-level, already handled
    const segment = f.relativePath.slice(0, sep);
    if (!seen.has(segment)) counts[segment] = (counts[segment] ?? 0) + 1;
  }
  for (const [id, count] of Object.entries(counts)) {
    categories.push({
      id,
      label: CATEGORY_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1),
      description: CATEGORY_DESCRIPTIONS[id] ?? '',
      fileCount: count,
    });
  }

  // ~/.claude.json (MCP config)
  try {
    await readFile(`${homePath}/.claude.json`);
    categories.push({
      id: '__home__',
      label: CATEGORY_LABELS['__home__'],
      description: CATEGORY_DESCRIPTIONS['__home__'],
      fileCount: 1,
    });
  } catch { /* not present */ }

  return categories;
}

/**
 * Recursively collect text files from a directory into flat list.
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
 * If omitted, exports everything.
 * Returns the path of the exported file.
 */
export async function exportBackup(selectedCategories?: string[]): Promise<string> {
  const base = await claudeDir();
  const home = await homeDir();
  const homePath = home.endsWith('/') ? home.slice(0, -1) : home;

  const files: BackupFile[] = [];
  const all = !selectedCategories || selectedCategories.length === 0;
  const catSet = new Set(selectedCategories ?? []);

  if (all || catSet.size > 0) {
    const allFiles: BackupFile[] = [];
    await collectFiles(base, base, allFiles);

    for (const f of allFiles) {
      const sep = f.relativePath.indexOf('/');
      const segment = sep === -1 ? '__root__' : f.relativePath.slice(0, sep);
      if (all || catSet.has(segment)) {
        files.push(f);
      }
    }

    // ~/.claude.json
    if (all || catSet.has('__home__')) {
      try {
        const claudeJson = await readFile(`${homePath}/.claude.json`);
        files.push({ relativePath: '__home__/.claude.json', content: claudeJson });
      } catch {}
    }
  }

  const bundle: BackupBundle = {
    version: '1',
    createdAt: new Date().toISOString(),
    claudeDir: base,
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
  let restored = 0;
  let skipped = 0;
  const total = bundle.files.length;

  for (const file of bundle.files) {
    try {
      // __home__/.claude.json is stored in home dir, not inside ~/.claude/
      const targetPath = file.relativePath.startsWith('__home__/')
        ? `${homePath}/${file.relativePath.slice('__home__/'.length)}`
        : `${base}/${file.relativePath}`;
      const dir = targetPath.substring(0, targetPath.lastIndexOf('/'));
      await ensureDir(dir);
      await writeFile(targetPath, file.content);
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
