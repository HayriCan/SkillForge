import type { CliAdapter, CliId } from './types';
import { ClaudeAdapter } from './claude';
import { CodexAdapter } from './codex';
import { GeminiAdapter } from './gemini';
import { loadAppConfig, saveAppConfig } from '../app-config';

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
