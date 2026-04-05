import { readFile, listDirFull, listDir } from './fs';
import { exists } from '@tauri-apps/plugin-fs';

export type SkillUsage = {
  pluginName: string;
  skillName: string;
  invokeCount: number;
  lastUsed: string | null;
};

export type PluginBreakdown = {
  pluginName: string;
  totalSkills: number;
  usedSkills: number;
  usagePercent: number;
};

export type InsightsData = {
  skills: SkillUsage[];
  plugins: PluginBreakdown[];
  totalSessions: number;
  totalTokenEstimate: number;
  unusedTokenEstimate: number;
  generatedAt: string;
  tier: 'full' | 'basic';
};

export type InsightsSnapshot = {
  generatedAt: string;
  pluginCount: number;
  skillCount: number;
  pluginVersions: Record<string, string>;
  historyLineCount: number;
};

/**
 * Parse history.jsonl for skill invocations.
 * Returns Map<skillName, {count, lastUsed}>.
 */
export async function parseHistoryInvokes(
  claudeDir: string,
): Promise<Map<string, { count: number; lastUsed: string }>> {
  const result = new Map<string, { count: number; lastUsed: string }>();
  const historyPath = `${claudeDir}/history.jsonl`;

  let content: string;
  try {
    content = await readFile(historyPath);
  } catch {
    return result;
  }

  const lines = content.split('\n').filter((l) => l.trim());
  const pattern = /(?:\/|skill:)([a-z][a-z0-9-]+)/g;

  for (const line of lines) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    const text = [parsed.display, parsed.command, parsed.message, parsed.input]
      .filter((v) => typeof v === 'string')
      .join(' ');

    const timestamp =
      typeof parsed.timestamp === 'string'
        ? parsed.timestamp
        : typeof parsed.createdAt === 'string'
          ? parsed.createdAt
          : new Date().toISOString();

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const skillName = match[1];
      const existing = result.get(skillName);
      if (existing) {
        existing.count++;
        if (timestamp > existing.lastUsed) {
          existing.lastUsed = timestamp;
        }
      } else {
        result.set(skillName, { count: 1, lastUsed: timestamp });
      }
    }
  }

  return result;
}

/**
 * Scan plugin cache for skill definitions.
 * Returns Map<pluginName, skillName[]>.
 */
export async function scanPluginSkills(
  claudeDir: string,
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const cachePath = `${claudeDir}/plugins/cache`;

  const topLevel = await listDirFull(cachePath);
  if (topLevel.length === 0) return result;

  for (const org of topLevel) {
    if (!org.isDir) continue;
    const orgPath = `${cachePath}/${org.name}`;
    const packages = await listDirFull(orgPath);

    for (const pkg of packages) {
      if (!pkg.isDir) continue;
      const pkgPath = `${orgPath}/${pkg.name}`;
      const versions = await listDirFull(pkgPath);

      for (const ver of versions) {
        if (!ver.isDir) continue;
        const skillsPath = `${pkgPath}/${ver.name}/skills`;
        const skillFiles = await listDirFull(skillsPath);
        const skills = skillFiles
          .filter((f) => !f.isDir && f.name.endsWith('.md'))
          .map((f) => f.name.replace(/\.md$/, ''));

        if (skills.length > 0) {
          const pluginName = org.name;
          const existing = result.get(pluginName) ?? [];
          result.set(pluginName, [...existing, ...skills]);
        }
      }
    }
  }

  return result;
}

/**
 * Count .jsonl session files under projects/ (max 2 depth levels).
 */
async function countSessionFiles(claudeDir: string): Promise<number> {
  const projectsPath = `${claudeDir}/projects`;
  let count = 0;

  const level1 = await listDirFull(projectsPath);
  for (const entry of level1) {
    if (entry.isDir) {
      const subPath = `${projectsPath}/${entry.name}`;
      const level2 = await listDirFull(subPath);
      for (const sub of level2) {
        if (!sub.isDir && sub.name.endsWith('.jsonl')) count++;
      }
    } else if (entry.name.endsWith('.jsonl')) {
      count++;
    }
  }

  return count;
}

/**
 * Build the full insights data object.
 */
export async function buildInsightsData(
  claudeDir: string,
): Promise<InsightsData> {
  const [invokes, pluginSkills] = await Promise.all([
    parseHistoryInvokes(claudeDir),
    scanPluginSkills(claudeDir),
  ]);

  const skills: SkillUsage[] = [];

  for (const [pluginName, skillNames] of pluginSkills) {
    for (const skillName of skillNames) {
      const usage = invokes.get(skillName);
      skills.push({
        pluginName,
        skillName,
        invokeCount: usage?.count ?? 0,
        lastUsed: usage?.lastUsed ?? null,
      });
    }
  }

  const plugins: PluginBreakdown[] = [];
  for (const [pluginName, skillNames] of pluginSkills) {
    const totalSkills = skillNames.length;
    const usedSkills = skillNames.filter(
      (s) => (invokes.get(s)?.count ?? 0) > 0,
    ).length;
    plugins.push({
      pluginName,
      totalSkills,
      usedSkills,
      usagePercent: totalSkills > 0 ? Math.round((usedSkills / totalSkills) * 100) : 0,
    });
  }

  const totalSessions = await countSessionFiles(claudeDir);
  const totalTokenEstimate = skills.length * 500;
  const unusedTokenEstimate =
    skills.filter((s) => s.invokeCount === 0).length * 500;

  let tier: 'full' | 'basic' = 'basic';
  try {
    if (await exists(`${claudeDir}/usage-data`)) {
      tier = 'full';
    }
  } catch {
    // ignore
  }

  return {
    skills,
    plugins,
    totalSessions,
    totalTokenEstimate,
    unusedTokenEstimate,
    generatedAt: new Date().toISOString(),
    tier,
  };
}

/**
 * Load a previously saved insights snapshot.
 */
export async function loadSnapshot(
  claudeDir: string,
): Promise<InsightsSnapshot | null> {
  try {
    const raw = await readFile(
      `${claudeDir}/skill-forge-insights-snapshot.json`,
    );
    return JSON.parse(raw) as InsightsSnapshot;
  } catch {
    return null;
  }
}

/**
 * Save an insights snapshot to disk.
 */
export async function saveSnapshot(
  claudeDir: string,
  data: InsightsData,
  pluginVersions: Record<string, string>,
): Promise<void> {
  const { writeFile } = await import('./fs');
  const snapshot: InsightsSnapshot = {
    generatedAt: data.generatedAt,
    pluginCount: data.plugins.length,
    skillCount: data.skills.length,
    pluginVersions,
    historyLineCount: await countHistoryLines(claudeDir),
  };
  await writeFile(
    `${claudeDir}/skill-forge-insights-snapshot.json`,
    JSON.stringify(snapshot, null, 2),
  );
}

/**
 * Check if a snapshot is stale compared to current state.
 */
export function isSnapshotStale(
  snapshot: InsightsSnapshot,
  currentPluginCount: number,
  currentSkillCount: number,
  currentHistoryLines: number,
): boolean {
  return (
    snapshot.pluginCount !== currentPluginCount ||
    snapshot.skillCount !== currentSkillCount ||
    snapshot.historyLineCount !== currentHistoryLines
  );
}

/**
 * Count lines in history.jsonl.
 */
export async function countHistoryLines(claudeDir: string): Promise<number> {
  try {
    const content = await readFile(`${claudeDir}/history.jsonl`);
    return content.split('\n').filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
}
