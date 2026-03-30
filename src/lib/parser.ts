export type SkillMeta = {
  name: string;
  description: string;
  raw: string;
};

export function parseSkillMd(content: string): SkillMeta {
  const raw = content;
  const normalized = content.replace(/\r\n/g, "\n");
  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return { name: "Unknown", description: "", raw };

  const fm = fmMatch[1];
  const nameMatch = fm.match(/^name:\s*"?(.*?)"?\s*$/m);
  const descMatch = fm.match(/^description:\s*"?(.*?)"?\s*$/m);

  return {
    name: nameMatch?.[1]?.trim() ?? "Unknown",
    description: descMatch?.[1]?.trim() ?? "",
    raw,
  };
}
