import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { appDataDir } from "@tauri-apps/api/path";

import type { CliId } from './adapters/types';

export type AppConfig = {
  /** @deprecated Use cliDirs instead. Kept for backwards compatibility. */
  claudeDir?: string;
  /** Per-CLI config directory overrides. Key: CliId, Value: absolute path */
  cliDirs?: Partial<Record<string, string>>;
  /** Active CLI adapter id; defaults to 'claude' when absent */
  activeCli?: CliId;
  /**
   * Per-CLI resource directory visibility config.
   * When set for a CLI, overrides auto-detection (show only existing dirs).
   * Key: CliId, Value: array of dir names to show in Resources sidebar.
   */
  resourceDirs?: Partial<Record<string, string[]>>;
  /**
   * Per-CLI custom emoji icons for nav items.
   * Key: CliId, Value: map of dir/view id → emoji string.
   */
  resourceIcons?: Partial<Record<string, Record<string, string>>>;
};

let configCache: AppConfig | null = null;

async function configPath(): Promise<string> {
  const dir = await appDataDir();
  const d = dir.endsWith('/') || dir.endsWith('\\') ? dir : `${dir}/`;
  return `${d}app-config.json`;
}

export async function loadAppConfig(): Promise<AppConfig> {
  if (configCache) return configCache;
  try {
    const path = await configPath();
    const raw = await readTextFile(path);
    configCache = JSON.parse(raw);
    return configCache!;
  } catch {
    configCache = {};
    return configCache;
  }
}

export async function saveAppConfig(config: AppConfig): Promise<void> {
  const dir = await appDataDir();
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
  const path = await configPath();
  await writeTextFile(path, JSON.stringify(config, null, 2));
  configCache = config;
}
