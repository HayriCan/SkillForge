export type SkillTemplateId = 'simple' | 'pattern' | 'checklist' | 'workflow';

export type SkillTemplateSection = {
  key: string;
  label: string;
  placeholder: string;
};

export type SkillTemplate = {
  id: SkillTemplateId;
  label: string;
  description: string;
  sections: SkillTemplateSection[];
};

export type TriggerOption = {
  id: string;
  label: string;
};

export type SkillDraft = {
  name: string;
  purpose: string;
  description: string;
  templateId: SkillTemplateId;
  sectionContent: Record<string, string>;
  targetCli: 'claude' | 'codex' | 'gemini' | 'all';
};

export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: 'simple',
    label: 'Simple',
    description: 'When to Use + Core Pattern — best for quick references',
    sections: [
      { key: 'when_to_use', label: 'When to Use', placeholder: 'Describe the exact situations where this skill activates...' },
      { key: 'core_pattern', label: 'Core Pattern', placeholder: 'The key approach, snippet, or reference content...' },
    ],
  },
  {
    id: 'pattern',
    label: 'Pattern',
    description: 'When to Use + Pattern + Examples + Anti-patterns',
    sections: [
      { key: 'when_to_use', label: 'When to Use', placeholder: 'Describe the exact situations...' },
      { key: 'core_pattern', label: 'Core Pattern', placeholder: 'The recommended approach...' },
      { key: 'examples', label: 'Examples', placeholder: 'Concrete code or usage examples...' },
      { key: 'anti_patterns', label: 'Anti-patterns', placeholder: 'Common mistakes to avoid...' },
    ],
  },
  {
    id: 'checklist',
    label: 'Checklist',
    description: 'When to Use + Step-by-step checklist — procedural tasks',
    sections: [
      { key: 'when_to_use', label: 'When to Use', placeholder: 'Describe when to run this checklist...' },
      { key: 'steps', label: 'Steps', placeholder: '- [ ] Step 1\n- [ ] Step 2\n- [ ] Step 3...' },
    ],
  },
  {
    id: 'workflow',
    label: 'Workflow',
    description: 'When to Use + Process Flow + Sections — complex workflows',
    sections: [
      { key: 'when_to_use', label: 'When to Use', placeholder: 'Describe the workflow context...' },
      { key: 'process_flow', label: 'Process Flow', placeholder: '1. First step\n2. Second step...' },
      { key: 'sections', label: 'Key Sections', placeholder: '## Section 1\nContent...' },
      { key: 'notes', label: 'Notes', placeholder: 'Important considerations...' },
    ],
  },
];

export const TRIGGER_OPTIONS: TriggerOption[] = [
  { id: 'writing_code',   label: 'Writing code' },
  { id: 'debugging',      label: 'Debugging' },
  { id: 'writing_tests',  label: 'Writing tests' },
  { id: 'code_review',    label: 'Code review' },
  { id: 'using_react',    label: 'Using React' },
  { id: 'using_python',   label: 'Using Python' },
  { id: 'using_go',       label: 'Using Go' },
  { id: 'using_typescript', label: 'Using TypeScript' },
];

/**
 * Validate a skill name: must be lowercase kebab-case, start with letter, max 60 chars.
 */
export function validateSkillName(name: string): string | null {
  if (!name) return 'Name is required';
  if (!/^[a-z][a-z0-9-]*$/.test(name)) return 'Use lowercase letters, numbers, and hyphens only (start with a letter)';
  if (name.length > 60) return 'Name must be 60 characters or less';
  return null;
}

/**
 * Convert arbitrary input to kebab-case suitable for skill names.
 */
export function toKebabCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generate a description string from selected trigger IDs.
 */
export function generateDescription(triggers: string[]): string {
  if (triggers.length === 0) return '';
  const labels = triggers.map(id => TRIGGER_OPTIONS.find(t => t.id === id)?.label ?? id);
  return `Use when ${labels.join(', ')}.`.slice(0, 1024);
}

/**
 * Generate the full SKILL.md file content from a draft.
 */
export function generateSkillFile(draft: SkillDraft): string {
  const template = SKILL_TEMPLATES.find(t => t.id === draft.templateId)!;
  const title = draft.name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const sections = template.sections
    .map(s => {
      const content = draft.sectionContent[s.key] ?? '';
      return `## ${s.label}\n${content}`;
    })
    .join('\n\n');
  return `---\nname: ${draft.name}\ndescription: ${draft.description}\n---\n\n# ${title}\n\n${sections}\n`;
}

/**
 * Get the skills directory path from a Claude base directory.
 */
export function getSkillDir(claudeBaseDir: string): string {
  return `${claudeBaseDir}/skills`;
}
