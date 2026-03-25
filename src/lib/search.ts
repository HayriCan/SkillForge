import { claudeDir, listDirFull, readFile } from "./fs";
import { exists } from "@tauri-apps/plugin-fs";

export type SearchResult = {
  viewId: string;
  fileName: string;
  icon: string;
  label: string;
};

type ResourceDef = {
  viewId: string;
  dir: string;
  icon: string;
  /** If true, list directories instead of files */
  listDirs?: boolean;
  /** File extension filter (e.g. ".md") */
  ext?: string;
};

const RESOURCE_DEFS: ResourceDef[] = [
  { viewId: "agents", dir: "agents", icon: "◈", ext: ".md" },
  { viewId: "commands", dir: "commands", icon: "⌘", ext: ".md" },
  { viewId: "hooks", dir: "hooks", icon: "⚡" },
  { viewId: "plans", dir: "plans", icon: "◇", ext: ".md" },
  { viewId: "skills", dir: "skills", icon: "✦", listDirs: true },
  { viewId: "tasks", dir: "tasks", icon: "☰", listDirs: true },
  { viewId: "teams", dir: "teams", icon: "⬡", listDirs: true },
  { viewId: "todos", dir: "todos", icon: "◻", ext: ".json" },
];

const CONFIG_FILES = [
  { viewId: "config", fileName: "CLAUDE.md", icon: "⚙", label: "CLAUDE.md" },
  { viewId: "config", fileName: "MEMORY.md", icon: "⚙", label: "MEMORY.md" },
];

const RECENT_KEY = "sf-recent-searches";
const MAX_RECENT = 5;
const MAX_RESULTS = 20;

/** Search all resources under the claude directory */
export async function searchResources(query: string): Promise<SearchResult[]> {
  const base = await claudeDir();
  const results: SearchResult[] = [];
  const q = query.toLowerCase();

  // Search resource directories
  for (const def of RESOURCE_DEFS) {
    const dirPath = `${base}/${def.dir}`;
    if (!(await exists(dirPath))) continue;

    try {
      const entries = await listDirFull(dirPath);
      for (const entry of entries) {
        if (def.listDirs && !entry.isDir) continue;
        if (!def.listDirs && entry.isDir) continue;
        if (def.ext && !entry.name.endsWith(def.ext)) continue;

        const label = entry.name;
        if (label.toLowerCase().includes(q)) {
          results.push({
            viewId: def.viewId,
            fileName: entry.name,
            icon: def.icon,
            label,
          });
        }
        if (results.length >= MAX_RESULTS) return results;
      }
    } catch {
      // skip unreadable directories
    }
  }

  // Search config files at root
  for (const cfg of CONFIG_FILES) {
    const filePath = `${base}/${cfg.fileName}`;
    if (cfg.label.toLowerCase().includes(q) && (await exists(filePath))) {
      results.push(cfg);
      if (results.length >= MAX_RESULTS) return results;
    }
  }

  // Search plugins from settings.json
  try {
    const settingsPath = `${base}/settings.json`;
    if (await exists(settingsPath)) {
      const raw = await readFile(settingsPath);
      const settings = JSON.parse(raw) as Record<string, unknown>;
      const plugins = settings.enabledPlugins as Record<string, boolean> | undefined;
      if (plugins) {
        for (const pluginName of Object.keys(plugins)) {
          if (pluginName.toLowerCase().includes(q)) {
            results.push({
              viewId: "plugins",
              fileName: pluginName,
              icon: "◎",
              label: pluginName,
            });
            if (results.length >= MAX_RESULTS) return results;
          }
        }
      }
    }
  } catch {
    // skip if settings unreadable
  }

  return results;
}

/** Get recent searches from localStorage */
export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Add a query to the recent searches list */
export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;

  const recent = getRecentSearches().filter((s) => s !== trimmed);
  recent.unshift(trimmed);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}
