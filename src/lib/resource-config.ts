import { removeHookReferencingFile } from './settings';

export type CreateTemplate = {
  /** 'file' creates a single file, 'directory' creates a folder + entry file */
  type: 'file' | 'directory';
  /** File extension: '.md', '.py', etc. */
  ext: string;
  /** Generate initial file content */
  stub: (name: string) => string;
  /** For directory mode: name of the main file inside the directory (e.g. 'SKILL.md') */
  entryFile?: string;
  /** Input placeholder text */
  placeholder?: string;
};

export type ResourceConfig = {
  /** Directory name under ~/.claude/ */
  dirName: string;
  /** Display label for headers and empty states */
  label: string;
  /** Only show files with these extensions. undefined = show all */
  fileExtensions?: string[];
  /** true = flat file list (no subdirectory navigation), false = allow navigation */
  hideDirs?: boolean;
  /** Template for creating new items. undefined = no "New" button */
  createTemplate?: CreateTemplate;
  /** Called after a file/directory is deleted */
  onAfterDelete?: (path: string) => Promise<void>;
  /** Called after a file/directory is created */
  onAfterCreate?: (path: string) => Promise<void>;
  /** Icon key for empty state */
  emptyIcon?: string;
  /** Title for empty state */
  emptyTitle?: string;
  /** Description for empty state */
  emptyDescription?: string;
  /** Enable version history. Default: true */
  enableHistory?: boolean;
  /** Enable bulk delete. Default: true */
  enableBulkDelete?: boolean;
  /** Show a "Wizard" button that opens a guided creation flow (e.g. SkillWizard) */
  enableWizard?: boolean;
};

export const resourceConfigs: Record<string, ResourceConfig> = {
  agents: {
    dirName: 'agents',
    label: 'Agents',
    fileExtensions: ['.md'],
    hideDirs: true,
    createTemplate: {
      type: 'file',
      ext: '.md',
      stub: (n) => `# ${n}\n`,
      placeholder: 'agent-name',
    },
    emptyIcon: 'agents',
    emptyTitle: 'No agents yet',
    emptyDescription: 'Create your first agent file',
  },
  commands: {
    dirName: 'commands',
    label: 'Commands',
    fileExtensions: ['.md'],
    hideDirs: true,
    createTemplate: {
      type: 'file',
      ext: '.md',
      stub: (n) => `# ${n}\n`,
      placeholder: 'command-name',
    },
    emptyIcon: 'commands',
    emptyTitle: 'No commands yet',
    emptyDescription: 'Create your first command file',
  },
  plans: {
    dirName: 'plans',
    label: 'Plans',
    fileExtensions: ['.md'],
    hideDirs: true,
    createTemplate: {
      type: 'file',
      ext: '.md',
      stub: (n) => `# ${n}\n`,
      placeholder: 'plan-name',
    },
    emptyIcon: 'plans',
    emptyTitle: 'No plans yet',
    emptyDescription: 'Create your first plan file',
  },
  skills: {
    dirName: 'skills',
    label: 'Skills',
    hideDirs: false,
    enableWizard: true,
    createTemplate: {
      type: 'directory',
      ext: '.md',
      entryFile: 'SKILL.md',
      stub: (n) => `---\nname: "${n}"\ndescription: ""\n---\n\n# ${n}\n`,
      placeholder: 'skill-name',
    },
    emptyIcon: 'skills',
    emptyTitle: 'No skills yet',
    emptyDescription: 'Create your first skill',
  },
  hooks: {
    dirName: 'hooks',
    label: 'Hooks',
    hideDirs: true,
    createTemplate: {
      type: 'file',
      ext: '.py',
      stub: (n) => `#!/usr/bin/env python3\n# Hook: ${n}\n`,
      placeholder: 'hook_name',
    },
    onAfterDelete: removeHookReferencingFile,
    emptyIcon: 'hooks',
    emptyTitle: 'No hooks yet',
    emptyDescription: 'Create your first hook script',
  },
};

/**
 * Build a default ResourceConfig for a custom (dynamic) folder.
 */
export function defaultFolderConfig(dirName: string): ResourceConfig {
  const label = dirName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    dirName,
    label,
    hideDirs: false,
    emptyTitle: 'Empty folder',
    emptyDescription: 'No files in this directory',
  };
}
