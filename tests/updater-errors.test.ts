import { describe, expect, it } from 'vitest';
import { classifyUpdaterError } from '../src/lib/updater-errors';

describe('classifyUpdaterError', () => {
  it('detects signature failures', () => {
    expect(classifyUpdaterError('pubkey mismatch while verifying signature')).toBe('signature');
  });

  it('detects network failures', () => {
    expect(classifyUpdaterError('network timeout while downloading release')).toBe('network');
  });

  it('detects metadata failures', () => {
    expect(classifyUpdaterError('latest.json returned empty body')).toBe('metadata');
  });

  it('detects permission failures', () => {
    expect(classifyUpdaterError('access denied when replacing app bundle')).toBe('permission');
  });

  it('falls back to generic', () => {
    expect(classifyUpdaterError('unexpected updater failure')).toBe('generic');
  });
});
