import {
  readTextFile,
  writeTextFile,
  remove,
  readDir,
  mkdir,
  exists,
  stat as fsStat,
} from "@tauri-apps/plugin-fs";
import { homeDir } from "@tauri-apps/api/path";
import { loadAppConfig } from "./app-config";
import { getAdapter } from "./adapters/index";

/**
 * Returns the active CLI's config directory path.
 * Respects a manual override in app-config (claudeDir field) when set.
 * Otherwise uses the active adapter's configDirName under $HOME.
 */
export async function claudeDir(): Promise<string> {
  const config = await loadAppConfig();
  if (config.claudeDir) {
    const p = config.claudeDir;
    return p.endsWith("/") || p.endsWith("\\") ? p.slice(0, -1) : p;
  }
  const home = await homeDir();
  const base = home.endsWith("/") ? home.slice(0, -1) : home;
  const adapter = getAdapter(config.activeCli);
  return `${base}/${adapter.configDirName}`;
}

export async function readFile(path: string): Promise<string> {
  return readTextFile(path);
}

export async function writeFile(path: string, content: string): Promise<void> {
  await writeTextFile(path, content);
}

export async function deleteFile(path: string): Promise<void> {
  await remove(path, { recursive: true });
}

export async function listDir(path: string): Promise<string[]> {
  const entries = await readDir(path);
  return entries.map((e) => e.name).filter(Boolean) as string[];
}

export async function listDirFull(
  path: string,
): Promise<{ name: string; isDir: boolean }[]> {
  const entries = await readDir(path);
  return entries.map((e) => ({
    name: e.name ?? "",
    isDir: e.isDirectory ?? false,
  }));
}

export async function ensureDir(path: string): Promise<void> {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true });
  }
}

export async function getCreatedAt(path: string): Promise<Date | null> {
  try {
    const info = await fsStat(path);
    return info.birthtime ? new Date(info.birthtime) : null;
  } catch {
    return null;
  }
}

/** Directories that never contain CLAUDE.md/MEMORY.md — skip for performance */
const SKIP_DIRS = new Set([
  "sessions", "tasks", "todos", "teams", "hooks", "cache",
  "plugins", "node_modules", ".git", "profiles",
]);

/** Recursively find files matching given names under a directory */
export async function findFiles(
  dir: string,
  targetNames: string[],
  maxDepth = 10,
): Promise<{ name: string; path: string; relativePath: string }[]> {
  const results: { name: string; path: string; relativePath: string }[] = [];
  const normalizedTargets = new Set(targetNames.map((name) => name.toLowerCase()));

  async function walk(current: string, depth: number) {
    if (depth > maxDepth) return;
    try {
      const entries = await readDir(current);
      for (const entry of entries) {
        const name = entry.name ?? "";
        if (!name) continue;
        const fullPath = `${current}/${name}`;
        if (entry.isDirectory) {
          if (SKIP_DIRS.has(name)) continue;
          await walk(fullPath, depth + 1);
        } else if (normalizedTargets.has(name.toLowerCase())) {
          const relativePath = fullPath.slice(dir.length + 1);
          results.push({ name, path: fullPath, relativePath });
        }
      }
    } catch {
      // skip unreadable directories
    }
  }

  await walk(dir, 0);
  return results;
}
