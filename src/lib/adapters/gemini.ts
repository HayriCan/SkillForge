import type { CliAdapter } from './types';

/**
 * Google Gemini CLI adapter — uses ~/.gemini/ as config directory.
 * Instructions are stored in GEMINI.md.
 * MCP servers are stored inside ~/.gemini/settings.json under mcpServers key.
 */
export const GeminiAdapter: CliAdapter = {
  id: 'gemini',
  label: 'Gemini',
  description: 'Google Gemini CLI (~/.gemini/)',
  color: 'blue',
  configDirName: '.gemini',
  instructionsFileName: 'GEMINI.md',
  settingsFileName: 'settings.json',
  settingsIsJson: true,
  mcpConfigFile: '.gemini/settings.json',
  supportsMcp: true,
};
