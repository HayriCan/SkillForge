import type { CliAdapter } from './types';

/**
 * OpenAI Codex CLI adapter — uses ~/.codex/ as config directory.
 *
 * Actual on-disk structure (inspected):
 *   config.toml      — model, project trust, feature flags (TOML, not JSON)
 *   skills/          — subdirs with SKILL.md (same format as Claude Code!)
 *   rules/           — permission/hook rules (e.g. default.rules)
 *   memories/        — memory files directory
 *   sessions/        — session history
 *   history.jsonl    — command history
 *
 * Codex does not use a single root instructions file.
 * MCP is not natively supported.
 */
export const CodexAdapter: CliAdapter = {
  id: 'codex',
  label: 'Codex',
  description: 'OpenAI Codex CLI (~/.codex/)',
  color: 'green',
  configDirName: '.codex',
  instructionsFileName: null,
  settingsFileName: 'config.toml',
  settingsIsJson: false,
  mcpConfigFile: null,
  supportsMcp: false,
};
