import type { CliAdapter, CliId } from './types';
import { ClaudeAdapter } from './claude';
import { CodexAdapter } from './codex';
import { GeminiAdapter } from './gemini';
import { loadAppConfig, saveAppConfig } from '../app-config';
import { homeDir } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/plugin-fs';

export type { CliAdapter, CliId };

/** All registered CLI adapters in display order */
export const CLI_ADAPTERS: CliAdapter[] = [ClaudeAdapter, CodexAdapter, GeminiAdapter];

/** Look up an adapter by id; falls back to Claude if not found */
export function getAdapter(id: CliId | string | undefined): CliAdapter {
  return CLI_ADAPTERS.find((a) => a.id === id) ?? ClaudeAdapter;
}

/** Load the currently active adapter from persisted app config */
export async function getActiveAdapter(): Promise<CliAdapter> {
  const config = await loadAppConfig();
  return getAdapter(config.activeCli);
}

/** Persist the active CLI selection and return the new adapter */
export async function setActiveAdapter(id: CliId): Promise<CliAdapter> {
  const config = await loadAppConfig();
  config.activeCli = id;
  await saveAppConfig(config);
  return getAdapter(id);
}

/**
 * Detect which CLI config directories exist on disk.
 * Returns only adapters whose configDirName exists under $HOME.
 * Claude is always included as it's the primary adapter.
 */
export async function detectInstalledClis(): Promise<CliAdapter[]> {
  const home = await homeDir();
  const base = home.endsWith('/') || home.endsWith('\\') ? home.slice(0, -1) : home;
  const results: CliAdapter[] = [];
  for (const adapter of CLI_ADAPTERS) {
    if (adapter.id === 'claude') {
      results.push(adapter);
      continue;
    }
    try {
      const dirExists = await exists(`${base}/${adapter.configDirName}`);
      if (dirExists) results.push(adapter);
    } catch {
      // Skip if check fails
    }
  }
  return results;
}
