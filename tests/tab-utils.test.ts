import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { parseTabIndicesFromPipe, resolveTabRef, getWindowTabs } from '@/commands/tab-utils';
import type { ExecutionContext } from '@/shared/types';

function mockCtx(): ExecutionContext {
  const chrome = createMockChromeAPI();
  return {
    vfs: {} as ExecutionContext['vfs'],
    chrome,
    env: {},
    cwd: '/',
    aliases: {},
    stdin: '',
    piped: false,
    cols: 80,
    writeStdout: () => {},
    writeStderr: () => {},
    setCwd: () => {},
    setEnv: () => {},
    setAlias: () => {},
  };
}

describe('tab-utils', () => {
  it('resolves tab by 1-based index', async () => {
    const ref = await resolveTabRef('2', mockCtx());
    expect(ref?.index).toBe(2);
    expect(ref?.id).toBe(2);
  });

  it('resolves current tab', async () => {
    const ref = await resolveTabRef('current', mockCtx());
    expect(ref?.id).toBe(1);
    expect(ref?.index).toBe(1);
  });

  it('lists window tabs in order', async () => {
    const tabs = await getWindowTabs(createMockChromeAPI(), 1);
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.id).toBe(1);
  });

  it('parses tab indices from piped output', () => {
    const text = `● #2  GitHub
  github.com
#5  ChatGPT`;
    expect(parseTabIndicesFromPipe(text)).toEqual([2, 5]);
  });
});