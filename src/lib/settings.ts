import { readFile, writeFile, claudeDir } from "./fs";

export type HookCommand = {
  type: "command";
  command: string;
  timeout?: number;
};

export type HookEntry = {
  matcher?: string;
  hooks: HookCommand[];
};

export type HooksConfig = Record<string, HookEntry[]>;

export type Permissions = {
  allow?: string[];
  deny?: string[];
  ask?: string[];
  additionalDirectories?: string[];
};

export type PluginStates = Record<string, boolean>;

export type ExtraKnownMarketplaces = Record<string, Record<string, unknown>>;

export type StatusLine = {
  type?: string;
  command?: string;
};

export type Settings = {
  env?: Record<string, string>;
  permissions?: Permissions;
  hooks?: HooksConfig;
  enabledPlugins?: PluginStates;
  extraKnownMarketplaces?: ExtraKnownMarketplaces;
  outputStyle?: string;
  effortLevel?: string;
  statusLine?: StatusLine;
  skipDangerousModePermissionPrompt?: boolean;
  [key: string]: unknown;
};

let _settingsPath: string | null = null;

async function settingsPath(): Promise<string> {
  if (!_settingsPath) {
    const base = await claudeDir();
    _settingsPath = `${base}/settings.json`;
  }
  return _settingsPath;
}

export async function loadSettings(): Promise<Settings> {
  const path = await settingsPath();
  const raw = await readFile(path);
  return JSON.parse(raw);
}

export async function saveSettings(settings: Settings): Promise<void> {
  const path = await settingsPath();
  await writeFile(path, JSON.stringify(settings, null, 2));
}

export async function patchSettings(
  patch: (s: Settings) => void,
): Promise<void> {
  const settings = await loadSettings();
  patch(settings);
  await saveSettings(settings);
}

export async function removeHookReferencingFile(
  filePath: string,
): Promise<void> {
  // Extract the filename to handle path mismatches (e.g. WSL vs macOS paths
  // in settings.json where the command may use a different base path than the
  // one Skill Forge resolves at runtime).
  const fileName = filePath.split("/").pop() ?? filePath;
  await patchSettings((s) => {
    if (!s.hooks) return;
    for (const eventName of Object.keys(s.hooks)) {
      s.hooks[eventName] = s.hooks[eventName]
        .map((entry) => ({
          ...entry,
          hooks: entry.hooks.filter(
            (h) => !h.command.includes(filePath) && !h.command.includes(fileName),
          ),
        }))
        .filter((entry) => entry.hooks.length > 0);
      if (s.hooks[eventName].length === 0) {
        delete s.hooks[eventName];
      }
    }
  });
}
