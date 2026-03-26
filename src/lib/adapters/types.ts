/** Supported CLI identifiers */
export type CliId = 'claude' | 'codex' | 'gemini';

/**
 * Adapter interface for an AI CLI tool managed by Skill Forge.
 * Each adapter describes where the CLI stores its config files and
 * which features it supports.
 */
export type CliAdapter = {
  /** Unique identifier used in app-config */
  id: CliId;
  /** Human-readable display name */
  label: string;
  /** One-line description shown in the CLI selector UI */
  description: string;
  /** CSS color token for the UI badge (Tailwind class suffix or hex) */
  color: string;
  /** Directory name under home (e.g. ".claude", ".codex", ".gemini") */
  configDirName: string;
  /**
   * Name of the root instructions/system-prompt file (e.g. "CLAUDE.md").
   * null if the CLI does not use a single root instructions file.
   */
  instructionsFileName: string | null;
  /**
   * Name of the settings/config file inside configDir.
   * null if not applicable. If the file is not JSON (e.g. TOML), set settingsIsJson = false.
   */
  settingsFileName: string | null;
  /** Whether the settings file is JSON-parseable (false = TOML or other format) */
  settingsIsJson: boolean;
  /**
   * Path of the file (relative to home) that contains the top-level
   * `mcpServers` object. null when MCP is not supported by this CLI.
   * Examples: ".claude.json" (Claude), ".gemini/settings.json" (Gemini)
   */
  mcpConfigFile: string | null;
  /** Whether this CLI natively supports MCP servers */
  supportsMcp: boolean;
};
