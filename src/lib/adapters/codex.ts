import type { CliAdapter } from './types';

/**
 * OpenAI Codex CLI adapter — uses ~/.codex/ as config directory.
 * Instructions are stored in AGENTS.md (OpenAI agent instructions spec).
 * MCP is not natively supported by Codex CLI.
 */
export const CodexAdapter: CliAdapter = {
  id: 'codex',
  label: 'Codex',
  description: 'OpenAI Codex CLI (~/.codex/)',
  color: 'green',
  configDirName: '.codex',
  instructionsFileName: 'AGENTS.md',
  settingsFileName: null,
  mcpConfigFile: null,
  supportsMcp: false,
};
