import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { ShellExecutor } from '@/shell/executor';

describe('downloads command', () => {
  it('lists downloads and supports show by #', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const list = await executor.execute('downloads');
    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain('report.pdf');
    expect(list.clickableList?.command(1)).toBe('downloads show 1');

    const show = await executor.execute('downloads show 1');
    expect(show.exitCode).toBe(0);
    expect(show.stdout).toContain('Revealed in folder');
  });

  it('reports when file is missing on disk', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI({
      downloads: {
        ...createMockChromeAPI().downloads,
        search: async () => [
          {
            id: 1,
            filename: 'gone.pdf',
            url: 'https://example.com/gone.pdf',
            state: 'complete',
            bytesReceived: 100,
            totalBytes: 100,
            startTime: Date.now(),
            exists: false,
          },
        ],
      },
    });
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('downloads show 1');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('no longer on disk');
  });

  it('dry-runs clear', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('downloads clear --dry-run');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[dry-run]');
    expect(result.stdout).toContain('downloads clear -f');
  });
});

describe('cookies and storage clear', () => {
  it('cookies clear requires -f', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('cookies clear');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('cookies clear -f');
  });

  it('storage clear dry-run', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('storage clear --dry-run');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[dry-run]');
  });
});

describe('forget dry-run', () => {
  it('previews without -f via dry-run', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('forget --dry-run');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[dry-run]');
    expect(result.stdout).toContain('forget -f');
  });
});

describe('session save/restore', () => {
  it('saves and lists a session', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const save = await executor.execute('session save work');
    expect(save.exitCode).toBe(0);
    expect(save.stdout).toContain('Saved session');

    const list = await executor.execute('session');
    expect(list.stdout).toContain('work');
  });

  it('dry-runs restore', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    await executor.execute('session save demo');
    const result = await executor.execute('session restore demo --dry-run');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[dry-run]');
  });
});

describe('siteinfo command', () => {
  it('audits the active site', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('siteinfo');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('cookies:');
    expect(result.stdout).toContain('history:');
    expect(result.stdout).toContain('forget');
  });
});

describe('extensions command', () => {
  it('lists extensions and supports disable by #', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const list = await executor.execute('extensions');
    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain('BrowserShell');

    const disable = await executor.execute('extensions disable 3');
    expect(disable.exitCode).toBe(0);
    expect(disable.stdout).toContain('Disabled');
  });
});

describe('go command', () => {
  it('finds tabs across all windows', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('go gmail');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('W#2');
    expect(result.stdout).toContain('Gmail');
  });
});

describe('history natural time filters', () => {
  it('parses history today', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('history today');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Example');
    expect(result.stdout).not.toContain('Other');
  });

  it('dry-runs history clear today', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('history clear today --dry-run');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[dry-run]');
    expect(result.stdout).toContain('today');
  });
});

describe('help categories', () => {
  it('shows privacy group', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('help privacy');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('forget');
    expect(result.stdout).toContain('cookies');
  });

  it('shows build stamp in overview', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('help');
    expect(result.stdout).toContain('v0.1.0');
    expect(result.stdout).toContain('build');
  });
});