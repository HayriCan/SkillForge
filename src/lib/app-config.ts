import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { appDataDir } from "@tauri-apps/api/path";

export type AppConfig = {
  claudeDir?: string;
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
    return {};
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
