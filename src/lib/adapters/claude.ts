import type { CliAdapter } from './types';

/** Claude Code adapter — uses ~/.claude/ as config directory */
export const ClaudeAdapter: CliAdapter = {
  id: 'claude',
  label: 'Claude Code',
  description: 'Anthropic Claude Code CLI (~/.claude/)',
  color: 'orange',
  configDirName: '.claude',
  instructionsFileName: 'CLAUDE.md',
  settingsFileName: 'settings.json',
  settingsIsJson: true,
  mcpConfigFile: '.claude.json',
  supportsMcp: true,
  supportedViews: null,
};
