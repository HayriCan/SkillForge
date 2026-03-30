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
  // AGENTS.md is the standard instructions file for Codex (may not exist until user creates it)
  instructionsFileName: 'AGENTS.md',
  settingsFileName: 'config.toml',
  settingsIsJson: false,
  mcpConfigFile: null,
  supportsMcp: false,
  // Dirs confirmed in ~/.codex: skills/, sessions/, rules/
  // rules/ maps loosely to hooks but uses execpolicy syntax — excluded from hooks view
  // memories/, log/, shell_snapshots/ are runtime/internal dirs
  supportedViews: ['config', 'skills', 'sessions', 'settings'],
};
