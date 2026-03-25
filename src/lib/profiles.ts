import { readFile, writeFile, listDirFull, ensureDir, deleteFile, claudeDir, findFiles } from './fs';
import { loadSettings, saveSettings, type Settings } from './settings';
import { loadMcpConfig, saveMcpConfig } from './mcp';

export type Profile = {
  name: string;
  description?: string;
  createdAt: string;
  isBlank?: boolean;
};

export type TrashedProfile = Profile & {
  deletedAt: string;
  trashName: string;
};

/** Directories snapshotted as part of a profile */
const SNAPSHOT_DIRS = ['agents', 'commands', 'hooks', 'plans', 'plugins', 'skills', 'tasks', 'teams', 'todos'];

/** Root-level files snapshotted as part of a profile */
const SNAPSHOT_ROOT_FILES = ['CLAUDE.md', 'MEMORY.md'];

/** Additional directories wiped when loading a blank profile (not snapshotted in full profiles) */
const BLANK_WIPE_DIRS: string[] = [];

/** Reserved folder name for the auto-saved Default state */
const DEFAULT_SNAPSHOT = '__default__';

/** Internal folder names that should not appear in the profile list */
const RESERVED_NAMES = new Set(['_trash', DEFAULT_SNAPSHOT]);

async function profilesDir(): Promise<string> {
  const base = await claudeDir();
  return `${base}/profiles`;
}

async function trashDir(): Promise<string> {
  return `${await profilesDir()}/_trash`;
}

/**
 * Recursively copy all text files from srcDir into destDir.
 */
async function copyDirSnapshot(srcDir: string, destDir: string): Promise<void> {
  try {
    const entries = await listDirFull(srcDir);
    await ensureDir(destDir);
    for (const entry of entries) {
      const src = `${srcDir}/${entry.name}`;
      const dest = `${destDir}/${entry.name}`;
      if (entry.isDir) {
        await copyDirSnapshot(src, dest);
      } else {
        try {
          const content = await readFile(src);
          await writeFile(dest, content);
        } catch { /* skip unreadable */ }
      }
    }
  } catch { /* src may not exist */ }
}

/**
 * Restore a dir from snapshot. ONLY proceeds if snapshot exists —
 * never deletes live data without a confirmed replacement.
 */
async function restoreDirSnapshot(srcDir: string, destDir: string): Promise<void> {
  // null  → directory not in snapshot (old profile) → leave live data untouched
  // []    → directory exists but empty (blank profile) → clear live dir
  // [...]  → directory has content → restore it
  const entries = await listDirFull(srcDir).catch(() => null);
  if (entries === null) return;
  try { await deleteFile(destDir); } catch {}
  if (entries.length > 0) await copyDirSnapshot(srcDir, destDir);
  else await ensureDir(destDir);
}

/**
 * Move a directory by copy + delete (Tauri rename not available).
 */
async function moveDir(src: string, dest: string): Promise<void> {
  await copyDirSnapshot(src, dest);
  await deleteFile(src);
}

export async function listProfiles(): Promise<Profile[]> {
  const dir = await profilesDir();
  try {
    const entries = await listDirFull(dir);
    const profiles: Profile[] = [];
    for (const e of entries.filter((e) => e.isDir && !RESERVED_NAMES.has(e.name))) {
      try {
        const raw = await readFile(`${dir}/${e.name}/profile.json`);
        profiles.push(JSON.parse(raw) as Profile);
      } catch {
        profiles.push({ name: e.name, createdAt: new Date().toISOString() });
      }
    }
    return profiles.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function listTrash(): Promise<TrashedProfile[]> {
  const dir = await trashDir();
  try {
    const entries = await listDirFull(dir);
    const items: TrashedProfile[] = [];
    for (const e of entries.filter((e) => e.isDir)) {
      try {
        const raw = await readFile(`${dir}/${e.name}/profile.json`);
        const profile = JSON.parse(raw) as Profile & { deletedAt?: string };
        items.push({
          ...profile,
          deletedAt: profile.deletedAt ?? new Date().toISOString(),
          trashName: e.name,
        });
      } catch {}
    }
    return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  } catch {
    return [];
  }
}

/**
 * Snapshot the current live state into an arbitrary directory.
 * Shared by saveProfile, createEmptyProfile guard, and autoSaveDefault.
 */
async function snapshotCurrentStateTo(profileDir: string): Promise<void> {
  const base = await claudeDir();
  await ensureDir(profileDir);
  const settings = await loadSettings();
  await writeFile(`${profileDir}/settings.json`, JSON.stringify(settings, null, 2));
  for (const file of SNAPSHOT_ROOT_FILES) {
    try {
      const content = await readFile(`${base}/${file}`);
      await writeFile(`${profileDir}/${file}`, content);
    } catch {}
  }
  for (const dirName of SNAPSHOT_DIRS) {
    await copyDirSnapshot(`${base}/${dirName}`, `${profileDir}/${dirName}`);
  }

  // MCP servers live in ~/.claude.json — snapshot separately
  try {
    const mcp = await loadMcpConfig();
    await writeFile(`${profileDir}/mcp-servers.json`, JSON.stringify(mcp, null, 2));
  } catch {}
}

/**
 * Auto-save the current state as the Default snapshot ONCE —
 * called on app launch and before the first named-profile load so Default can restore it.
 */
export async function autoSaveDefault(): Promise<void> {
  const dir = await profilesDir();
  const defaultDir = `${dir}/${DEFAULT_SNAPSHOT}`;
  const exists = await listDirFull(defaultDir).catch(() => null);
  if (exists !== null) return; // already saved
  await snapshotCurrentStateTo(defaultDir);
}

/**
 * Save the full current Claude config as a named profile snapshot.
 */
export async function saveProfile(name: string, description?: string): Promise<void> {
  const dir = await profilesDir();
  const profileDir = `${dir}/${name}`;
  await snapshotCurrentStateTo(profileDir);
  const meta: Profile = { name, description, createdAt: new Date().toISOString() };
  await writeFile(`${profileDir}/profile.json`, JSON.stringify(meta, null, 2));
}

/**
 * Create a blank profile that represents a factory-fresh Claude Code installation:
 * default settings, no CLAUDE.md, no MEMORY.md, no MCP servers, empty resource dirs.
 */
export async function createEmptyProfile(name: string, description?: string): Promise<void> {
  const dir = await profilesDir();
  const profileDir = `${dir}/${name}`;
  await ensureDir(profileDir);

  // Default (empty) settings — not copied from current live state
  await writeFile(`${profileDir}/settings.json`, JSON.stringify({}, null, 2));

  // Empty MCP config — no servers
  await writeFile(`${profileDir}/mcp-servers.json`, JSON.stringify({ mcpServers: {} }, null, 2));

  // Empty resource directories — all known dirs so loadProfile can wipe them
  for (const dirName of [...SNAPSHOT_DIRS, ...BLANK_WIPE_DIRS]) {
    await ensureDir(`${profileDir}/${dirName}`);
  }

  const meta: Profile = { name, description, createdAt: new Date().toISOString(), isBlank: true };
  await writeFile(`${profileDir}/profile.json`, JSON.stringify(meta, null, 2));
}

/**
 * Restore a profile: overwrite current Claude config with the snapshot.
 * Auto-saves current state as Default before the very first profile switch.
 * Also saves the currently active named profile before switching away from it.
 */
export async function loadProfile(name: string): Promise<void> {
  await autoSaveDefault();

  // Save current active named profile's live state before switching away
  const currentProfile = getActiveProfile();
  if (currentProfile) {
    const dir = await profilesDir();
    await snapshotCurrentStateTo(`${dir}/${currentProfile}`);
  }
  const base = await claudeDir();
  const dir = await profilesDir();
  const profileDir = `${dir}/${name}`;

  const settingsRaw = await readFile(`${profileDir}/settings.json`);
  await saveSettings(JSON.parse(settingsRaw) as Settings);

  for (const file of SNAPSHOT_ROOT_FILES) {
    try {
      const content = await readFile(`${profileDir}/${file}`);
      await writeFile(`${base}/${file}`, content);
    } catch {}
  }

  for (const dirName of SNAPSHOT_DIRS) {
    await restoreDirSnapshot(`${profileDir}/${dirName}`, `${base}/${dirName}`);
  }

  // Restore MCP servers into ~/.claude.json
  try {
    const raw = await readFile(`${profileDir}/mcp-servers.json`);
    await saveMcpConfig(JSON.parse(raw));
  } catch {}

  // Blank profiles: wipe all config files and runtime dirs for a factory-fresh state
  try {
    const metaRaw = await readFile(`${profileDir}/profile.json`);
    const meta = JSON.parse(metaRaw) as Profile;
    if (meta.isBlank) {
      // Delete every CLAUDE.md / MEMORY.md found under ~/.claude/ (respects SKIP_DIRS, skips profiles/)
      const configFiles = await findFiles(base, ['CLAUDE.md', 'MEMORY.md']).catch(() => []);
      for (const { path } of configFiles) {
        try { await deleteFile(path); } catch {}
      }

      // Wipe runtime dirs
      for (const dirName of BLANK_WIPE_DIRS) {
        try { await deleteFile(`${base}/${dirName}`); } catch {}
        await ensureDir(`${base}/${dirName}`);
      }

      // Clear only settings.local.json mcpServers (user-level ~/.claude.json already handled above)
      // NOTE: project-scoped MCP servers in ~/.claude.json data.projects are NOT touched —
      // the profile system doesn't snapshot them so wiping them would cause unrecoverable data loss.
      try {
        const localPath = `${base}/settings.local.json`;
        const raw = await readFile(localPath);
        const local = JSON.parse(raw) as Record<string, unknown>;
        if (local.mcpServers !== undefined) {
          delete local.mcpServers;
          await writeFile(localPath, JSON.stringify(local, null, 2));
        }
      } catch {}
    }
  } catch {}

  localStorage.setItem('sf-active-profile', name);
}

/**
 * Move profile to trash instead of permanently deleting.
 */
export async function deleteProfile(name: string): Promise<void> {
  const dir = await profilesDir();
  const trash = await trashDir();
  await ensureDir(trash);

  // Stamp deletedAt in profile.json before moving
  try {
    const metaPath = `${dir}/${name}/profile.json`;
    const raw = await readFile(metaPath);
    const meta = JSON.parse(raw) as Profile & { deletedAt?: string };
    meta.deletedAt = new Date().toISOString();
    await writeFile(metaPath, JSON.stringify(meta, null, 2));
  } catch {}

  await moveDir(`${dir}/${name}`, `${trash}/${name}-${Date.now()}`);

  if (localStorage.getItem('sf-active-profile') === name) {
    localStorage.removeItem('sf-active-profile');
  }
}

/**
 * Restore a trashed profile back to the profiles directory.
 * Returns the restored profile name (may differ if conflict).
 */
export async function restoreFromTrash(trashName: string): Promise<string> {
  const dir = await profilesDir();
  const trash = await trashDir();

  // Strip trailing -timestamp to get original name
  const lastDash = trashName.lastIndexOf('-');
  let destName = lastDash > 0 ? trashName.slice(0, lastDash) : trashName;

  // Avoid name conflict
  try {
    await listDirFull(`${dir}/${destName}`);
    destName = `${destName}-restored`;
  } catch {}

  await moveDir(`${trash}/${trashName}`, `${dir}/${destName}`);

  // Clean up deletedAt + fix name in profile.json
  try {
    const metaPath = `${dir}/${destName}/profile.json`;
    const raw = await readFile(metaPath);
    const meta = JSON.parse(raw) as Profile & { deletedAt?: string };
    delete meta.deletedAt;
    meta.name = destName;
    await writeFile(metaPath, JSON.stringify(meta, null, 2));
  } catch {}

  return destName;
}

/**
 * Permanently delete a trashed profile.
 */
export async function purgeFromTrash(trashName: string): Promise<void> {
  await deleteFile(`${await trashDir()}/${trashName}`);
}

/**
 * Copy selected resource directories from one profile snapshot to another.
 * Merges into destination (does not delete existing files).
 */
export async function copyResourcesBetweenProfiles(
  fromName: string,
  toName: string,
  dirs: string[],
): Promise<void> {
  const dir = await profilesDir();
  for (const dirName of dirs) {
    await copyDirSnapshot(`${dir}/${fromName}/${dirName}`, `${dir}/${toName}/${dirName}`);
  }
}

export function getActiveProfile(): string | null {
  return localStorage.getItem('sf-active-profile');
}

export function clearActiveProfile(): void {
  localStorage.removeItem('sf-active-profile');
}

/**
 * Switch to Default: restore the auto-saved Default snapshot if it exists,
 * otherwise just clear the active profile marker.
 * Saves the currently active named profile before switching away from it.
 */
export async function switchToDefault(): Promise<void> {
  // Save current active named profile's live state before switching to default
  const currentProfile = getActiveProfile();
  if (currentProfile) {
    const dir = await profilesDir();
    await snapshotCurrentStateTo(`${dir}/${currentProfile}`);
  }

  const dir = await profilesDir();
  const defaultDir = `${dir}/${DEFAULT_SNAPSHOT}`;
  const base = await claudeDir();

  const exists = await listDirFull(defaultDir).catch(() => null);
  if (exists !== null) {
    try {
      const settingsRaw = await readFile(`${defaultDir}/settings.json`);
      await saveSettings(JSON.parse(settingsRaw) as Settings);
    } catch {}
    for (const file of SNAPSHOT_ROOT_FILES) {
      try {
        const content = await readFile(`${defaultDir}/${file}`);
        await writeFile(`${base}/${file}`, content);
      } catch {}
    }
    for (const dirName of SNAPSHOT_DIRS) {
      await restoreDirSnapshot(`${defaultDir}/${dirName}`, `${base}/${dirName}`);
    }

    try {
      const raw = await readFile(`${defaultDir}/mcp-servers.json`);
      await saveMcpConfig(JSON.parse(raw));
    } catch {}
  }

  localStorage.removeItem('sf-active-profile');
}

export { SNAPSHOT_DIRS };
