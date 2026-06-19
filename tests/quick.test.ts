import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { ShellExecutor } from '@/shell/executor';
import { expandBang, expandShellHistory } from '@/shell/history-expand';

describe('history expansion', () => {
  it('repeats last command with !!', () => {
    expect(expandShellHistory('!!', 'tabs')).toBe('tabs');
    expect(expandShellHistory('echo !!', 'go github')).toBe('echo go github');
  });

  it('expands bang searches to go', () => {
    expect(expandBang('!g rust lang')).toContain('go https://www.google.com/search');
    expect(expandBang('!gh react')).toContain('github.com/search');
  });
});

describe('quick commands', () => {
  it('go switches to matching tab', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();
    const result = await executor.execute('go github');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('GitHub');
  });

  it('qf finds tab by pattern', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();
    const result = await executor.execute('qf example');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Example');
  });

  it('tab next cycles tabs', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();
    const result = await executor.execute('tab next');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('#');
  });
});