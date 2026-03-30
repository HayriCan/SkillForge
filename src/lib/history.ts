type HistoryEntry = {
  path: string;
  content: string;
  timestamp: number;
};

const MAX_ENTRIES = 50;
const STORAGE_KEY = "skill-forge-history";

/**
 * Push a snapshot of a file's content before it gets overwritten.
 */
export function pushHistory(path: string, content: string): void {
  const entries = getHistory();
  entries.unshift({ path, content, timestamp: Date.now() });
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full — drop oldest half
    entries.length = Math.floor(entries.length / 2);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}

/**
 * Get all history entries, newest first.
 */
export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Get history entries for a specific file path.
 */
export function getFileHistory(path: string): HistoryEntry[] {
  return getHistory().filter((e) => e.path === path);
}

/**
 * Clear all history.
 */
export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
