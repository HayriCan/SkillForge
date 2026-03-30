import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';

// Mock ../src/lib/fs — the mock file at tests/__mocks__/fs.ts provides the fns
vi.mock('../src/lib/fs', () => import('./__mocks__/fs'));

// @tauri-apps/api/path is aliased in vite.config.js to the mock

import { readFile, writeFile, listDirFull, ensureDir, claudeDir } from '../src/lib/fs';
import { homeDir } from '@tauri-apps/api/path';

// Fixtures
import validBackup from './fixtures/valid-backup.json';
import invalidVersionBackup from './fixtures/invalid-version.json';
import emptyBackup from './fixtures/empty-backup.json';
import homeFileBackup from './fixtures/home-file-backup.json';

// Cast mocks for type safety
const mockReadFile = readFile as MockedFunction<typeof readFile>;
const mockWriteFile = writeFile as MockedFunction<typeof writeFile>;
const mockListDirFull = listDirFull as MockedFunction<typeof listDirFull>;
const mockEnsureDir = ensureDir as MockedFunction<typeof ensureDir>;
const mockClaudeDir = claudeDir as MockedFunction<typeof claudeDir>;
const mockHomeDir = homeDir as MockedFunction<typeof homeDir>;

// Import the module under test AFTER mocks are set up
import { exportBackup, importBackup } from '../src/lib/backup';

describe('backup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockClaudeDir.mockResolvedValue('/mock/home/.claude');
    mockHomeDir.mockResolvedValue('/mock/home/');
    mockWriteFile.mockResolvedValue(undefined);
    mockEnsureDir.mockResolvedValue(undefined);
  });

  // ─── exportBackup ───────────────────────────────────────────────

  describe('exportBackup()', () => {
    it('should produce empty files array when listDirFull returns [] and ~/.claude.json is unreadable', async () => {
      mockListDirFull.mockResolvedValueOnce([]);
      // ~/.claude.json read fails
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const outPath = await exportBackup();

      // writeFile is called with the bundle
      expect(mockWriteFile).toHaveBeenCalledOnce();
      const bundle = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(bundle.files).toEqual([]);
      expect(bundle.version).toBe('1');
    });

    it('should only include files from selected categories when provided', async () => {
      mockListDirFull
        .mockResolvedValueOnce([
          { name: 'CLAUDE.md', isDir: false },
          { name: 'settings.json', isDir: false },
          { name: 'agents', isDir: true },
        ])
        .mockResolvedValueOnce([
          { name: 'myagent.md', isDir: false },
        ]);
      mockReadFile
        .mockResolvedValueOnce('# Rules')
        .mockResolvedValueOnce('{"theme":"dark"}')
        .mockResolvedValueOnce('agent-content');

      await exportBackup(['__root__']);

      const bundle = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(bundle.files).toEqual([
        { relativePath: 'CLAUDE.md', content: '# Rules' },
        { relativePath: 'settings.json', content: '{"theme":"dark"}' },
      ]);
      expect(mockReadFile).toHaveBeenCalledWith('/mock/home/.claude/CLAUDE.md');
      expect(mockReadFile).toHaveBeenCalledWith('/mock/home/.claude/settings.json');
      expect(mockReadFile).toHaveBeenCalledWith('/mock/home/.claude/agents/myagent.md');
    });

    it('should produce filename starting with skill-forge-backup- and ending with .sfbackup', async () => {
      mockListDirFull.mockResolvedValueOnce([]);
      mockReadFile.mockRejectedValue(new Error('not found'));

      const outPath = await exportBackup();

      const filename = outPath.split('/').pop()!;
      expect(filename).toMatch(/^skill-forge-backup-/);
      expect(filename).toMatch(/\.sfbackup$/);
    });

    it('should include files returned by listDirFull in the bundle', async () => {
      // claudeDir listing returns one file
      mockListDirFull.mockResolvedValueOnce([
        { name: 'settings.json', isDir: false },
      ]);
      // readFile for settings.json
      mockReadFile
        .mockResolvedValueOnce('{"theme":"dark"}')
        // readFile for ~/.claude.json
        .mockResolvedValueOnce('{"projects":{}}');

      await exportBackup();

      const bundle = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(bundle.files).toHaveLength(2);
      expect(bundle.files[0]).toEqual({
        relativePath: 'settings.json',
        content: '{"theme":"dark"}',
      });
      expect(bundle.files[1]).toEqual({
        relativePath: '__home__/.claude.json',
        content: '{"projects":{}}',
      });
    });
  });

  // ─── importBackup — merge mode ──────────────────────────────────

  describe('importBackup() — merge mode', () => {
    it('should restore all files from valid-backup fixture', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(validBackup));

      const result = await importBackup('/some/path/backup.ccmbackup', 'merge');

      expect(result).toEqual({ restored: 4, skipped: 0 });
    });

    it('should write __home__/.claude.json to home dir, not inside .claude/', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(homeFileBackup));

      await importBackup('/some/path/backup.ccmbackup', 'merge');

      // __home__/.claude.json → /mock/home/.claude.json (NOT /mock/home/.claude/__home__/.claude.json)
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/mock/home/.claude.json',
        '{"projects":{"myproject":{}}}',
      );
    });

    it('should call ensureDir for every file before writing', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(validBackup));

      await importBackup('/some/path/backup.ccmbackup', 'merge');

      // 4 files → 4 ensureDir calls
      expect(mockEnsureDir).toHaveBeenCalledTimes(4);
    });
  });

  // ─── importBackup — error scenarios ─────────────────────────────

  describe('importBackup() — error scenarios', () => {
    it('should throw on unsupported backup version', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidVersionBackup));

      await expect(importBackup('/path/backup.ccmbackup')).rejects.toThrow(
        'Unsupported backup version: 2',
      );
    });

    it('should throw on malformed JSON', async () => {
      mockReadFile.mockResolvedValueOnce('{ not valid json !!!');

      await expect(importBackup('/path/backup.ccmbackup')).rejects.toThrow();
    });

    it('should increment skipped count when writeFile throws', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(validBackup));
      // ensureDir succeeds, but writeFile always fails
      mockWriteFile.mockRejectedValue(new Error('disk full'));

      const result = await importBackup('/path/backup.ccmbackup', 'merge');

      expect(result).toEqual({ restored: 0, skipped: 4 });
    });
  });

  // ─── collectFiles — SKIP_DIRS (tested via exportBackup) ────────

  describe('collectFiles — SKIP_DIRS', () => {
    it('should not recurse into sessions, cache, node_modules, .git, or profiles directories', async () => {
      // Root listing includes skippable dirs + one valid file
      mockListDirFull.mockResolvedValueOnce([
        { name: 'sessions', isDir: true },
        { name: 'cache', isDir: true },
        { name: 'node_modules', isDir: true },
        { name: '.git', isDir: true },
        { name: 'profiles', isDir: true },
        { name: 'CLAUDE.md', isDir: false },
      ]);

      // readFile for CLAUDE.md
      mockReadFile
        .mockResolvedValueOnce('# Rules')
        // readFile for ~/.claude.json — fail so it's skipped
        .mockRejectedValueOnce(new Error('not found'));

      await exportBackup();

      // listDirFull should only be called once (root) — no recursive calls for skipped dirs
      expect(mockListDirFull).toHaveBeenCalledTimes(1);

      const bundle = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(bundle.files).toHaveLength(1);
      expect(bundle.files[0].relativePath).toBe('CLAUDE.md');
    });
  });
});
