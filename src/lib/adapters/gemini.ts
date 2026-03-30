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
  // Confirmed: GEMINI.md, settings.json (MCP), skills/, extensions/
  // Hooks exist as lifecycle scripts but not as a ~/hooks/ dir — excluded
  // plans/tasks/agents/commands dirs do not exist in Gemini CLI
  supportedViews: ['config', 'skills', 'mcp', 'settings'],
};
