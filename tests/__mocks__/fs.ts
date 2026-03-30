import { vi } from 'vitest';

export const readFile = vi.fn();
export const writeFile = vi.fn();
export const listDirFull = vi.fn();
export const ensureDir = vi.fn();
export const claudeDir = vi.fn().mockResolvedValue('/mock/home/.claude');
