import { invoke } from '@tauri-apps/api/core';
import { writeFile, ensureDir, listDir } from './fs';
import type { InsightsData } from './insights';

export type SuggestionType = 'skill' | 'agent' | 'command';

export type Suggestion = {
  type: SuggestionType;
  name: string;
  description: string;
  rationale: string;
  content: string;
};

/**
 * Build a compact usage summary and ask the active CLI to suggest
 * new skills/agents/commands that would improve the user's workflow.
 */
export async function generateSuggestions(
  cliId: string,
  data: InsightsData,
  baseDir: string,
): Promise<Suggestion[]> {
  // Collect already-installed custom skill/agent/command names so AI won't re-suggest them
  const existingNames: string[] = [];
  try {
    const skillDirs = await listDir(`${baseDir}/skills`);
    existingNames.push(...skillDirs);
  } catch { /* dir may not exist */ }
  try {
    const agentFiles = await listDir(`${baseDir}/agents`);
    existingNames.push(...agentFiles.map((f) => f.replace(/\.md$/, '')));
  } catch { /* dir may not exist */ }
  try {
    const cmdFiles = await listDir(`${baseDir}/commands`);
    existingNames.push(...cmdFiles.map((f) => f.replace(/\.md$/, '')));
  } catch { /* dir may not exist */ }

  const topSkills = [...data.skills]
    .sort((a, b) => b.invokeCount - a.invokeCount)
    .slice(0, 10);
  const unusedSkills = data.skills
    .filter((s) => s.invokeCount === 0)
    .slice(0, 8);

  const prompt = `You are analyzing Claude Code usage patterns to suggest genuinely useful new resources.

Usage summary:
- Total sessions: ${data.totalSessions}
- Installed plugins: ${data.plugins.length}
- Total skills installed: ${data.skills.length}
- Skills actually used (>0 invokes): ${data.skills.filter((s) => s.invokeCount > 0).length}

Top used skills:
${topSkills.map((s) => `- ${s.skillName} (${s.pluginName}): ${s.invokeCount} invokes`).join('\n')}

Unused skills (0 invokes):
${unusedSkills.map((s) => `- ${s.skillName} (${s.pluginName})`).join('\n')}

Plugin breakdown:
${data.plugins.map((p) => `- ${p.pluginName}: ${p.usedSkills}/${p.totalSkills} skills used (${p.usagePercent}%)`).join('\n')}

${existingNames.length > 0 ? `Already installed (DO NOT suggest these — they already exist):\n${existingNames.map((n) => `- ${n}`).join('\n')}\n` : ''}Based on this usage data, suggest 4 new Claude Code resources (skills, agents, or commands) that would genuinely improve this user's workflow.
Focus on: automating repeated patterns, filling skill gaps, or replacing consistently unused skills.
IMPORTANT: Never suggest anything from the "Already installed" list above.

Return ONLY a valid JSON array with no other text, explanation, or markdown fences:
[
  {
    "type": "skill",
    "name": "kebab-case-name",
    "description": "One clear sentence describing what this does",
    "rationale": "Specific reason this fits their usage pattern",
    "content": "Full file content (SKILL.md with YAML frontmatter + numbered steps)"
  }
]

For type "agent": content is a markdown agent definition with role, tools, and behavior.
For type "command": content is a markdown /command workflow with numbered steps.
For type "skill": content is SKILL.md with YAML frontmatter (name, description) and step-by-step instructions.`;

  const raw = await invoke<string>('run_cli_prompt', { cliId, prompt });

  // Strip markdown code fences if present
  const clean = raw
    .replace(/^```json?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim();

  // Extract first JSON array from response
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in CLI response');

  return JSON.parse(match[0]) as Suggestion[];
}

/**
 * Create a suggested resource file in the appropriate directory.
 * Returns the created file path.
 */
export async function createSuggestion(
  suggestion: Suggestion,
  baseDir: string,
): Promise<string> {
  let filePath: string;

  if (suggestion.type === 'skill') {
    const dir = `${baseDir}/skills/${suggestion.name}`;
    await ensureDir(dir);
    filePath = `${dir}/SKILL.md`;
  } else if (suggestion.type === 'agent') {
    await ensureDir(`${baseDir}/agents`);
    filePath = `${baseDir}/agents/${suggestion.name}.md`;
  } else {
    await ensureDir(`${baseDir}/commands`);
    filePath = `${baseDir}/commands/${suggestion.name}.md`;
  }

  await writeFile(filePath, suggestion.content);
  return filePath;
}
