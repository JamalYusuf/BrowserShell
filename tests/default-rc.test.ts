import { describe, expect, it } from 'vitest';
import { DEFAULT_RC } from '@/shared/default-rc';
import { parseRc } from '@/shared/rc-parser';
import { DEFAULT_CONFIG, DEFAULT_SHELL_CONFIG, ensureRcDefaults } from '@/shared/storage';

describe('default rc', () => {
  it('ships with global hotkeys enabled', () => {
    expect(DEFAULT_CONFIG.globalHotkeys).toBe(true);
    expect(DEFAULT_RC).toContain('global-hotkeys = true');
    expect(DEFAULT_RC).toContain('bind f hints-current');
  });

  it('parses default binds and bangs', () => {
    const parsed = parseRc(DEFAULT_RC);
    expect(parsed.binds.some((b) => b.action === 'hints-current')).toBe(true);
    expect(parsed.bangs.some((b) => b.name === 'gh')).toBe(true);
    expect(parsed.settings['global-hotkeys']).toBe('true');
  });

  it('restores default rc when binds are missing', () => {
    const broken = ensureRcDefaults({
      ...DEFAULT_SHELL_CONFIG,
      rc: '# empty\nalias g=go\n',
      rcVersion: 3,
      globalHotkeys: false,
    });
    expect(broken.rc).toContain('bind f hints-current');
    expect(broken.globalHotkeys).toBe(true);
  });
});