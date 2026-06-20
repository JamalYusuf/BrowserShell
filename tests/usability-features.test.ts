import { describe, expect, it, vi } from 'vitest';
import { createMockChromeAPI, type ChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { formatPromptTemplate } from '@/shell/prompt';
import { matchListRowIndex } from '@/shell/clickable-list';
import {
  appendTranscriptOutput,
  beginTranscriptEntry,
  clearTranscript,
  endTranscriptEntry,
  getTranscript,
} from '@/shell/transcript';
import { ShellExecutor } from '@/shell/executor';

describe('prompt template', () => {
  it('renders user@host:cwd format', () => {
    const text = formatPromptTemplate('\\u@\\h:\\w$ ', {
      user: 'browser',
      host: 'jamal.dev',
      cwd: '/',
    });
    expect(text).toBe('browser@jamal.dev:~$ ');
  });
});

describe('clickable list rows', () => {
  it('matches numbered table rows from xterm buffer text', () => {
    const hit = matchListRowIndex('3  Sign in   https://example.com/login');
    expect(hit?.index).toBe(3);
    expect(hit?.xStart).toBe(0);
    expect(hit?.xEnd).toBeGreaterThan(10);
  });
});

describe('session transcript', () => {
  it('records prompt, command, and output', () => {
    clearTranscript();
    beginTranscriptEntry('browser@jamal.dev:~$ ', 'tabs');
    appendTranscriptOutput('1 Example\n');
    endTranscriptEntry();
    expect(getTranscript()).toContain('browser@jamal.dev:~$ tabs');
    expect(getTranscript()).toContain('1 Example');
  });
});

describe('export log', () => {
  it('writes transcript to scripts and reports success', async () => {
    clearTranscript();
    beginTranscriptEntry('browser@example.com:~$ ', 'help');
    appendTranscriptOutput('commands listed\n');
    endTranscriptEntry();

    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('export log ~/session.txt');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('/scripts/session.txt');
    expect(result.stdout).toContain('downloaded session.txt');
  });
});

describe('clip log', () => {
  it('requires a non-empty transcript', async () => {
    clearTranscript();
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const empty = await executor.execute('clip log');
    expect(empty.exitCode).toBe(1);

    beginTranscriptEntry('browser@jamal.dev:~$ ', 'echo hi');
    appendTranscriptOutput('hi\n');
    endTranscriptEntry();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const copied = await executor.execute('clip log');
    expect(copied.exitCode).toBe(0);
    expect(copied.stdout).toContain('Copied session log');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('echo hi'));
  });
});

describe('strategic batch commands', () => {
  it('search returns ranked clickable hits', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('search github');
    expect(result.exitCode).toBe(0);
    expect(result.clickableList?.count).toBeGreaterThan(0);
  });

  it('recent lists closed sessions with click actions', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('recent');
    expect(result.exitCode).toBe(0);
    expect(result.clickableList?.command(1)).toBe('recent restore 1');
  });

  it('watch command returns watch metadata', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('watch 2 tabs');
    expect(result.exitCode).toBe(0);
    expect(result.watch?.command).toBe('tabs');
    expect(result.watch?.intervalMs).toBe(2000);
  });

  it('history list exposes go links', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('history github');
    expect(result.clickableList?.count).toBeGreaterThan(0);
    expect(result.clickableList?.command(1)).toMatch(/^go /);
  });

  it('!bm expands to bookmark search', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('!bm project');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Project');
  });
});

describe('clickable list metadata', () => {
  it('links command exposes click actions', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI({
      scripting: {
        ...createMockChromeAPI().scripting,
        executePageScript: (async (_id, scriptName) => {
          if (scriptName === 'listPageLinks') {
            return [
              { text: 'Home', href: 'https://example.com/' },
              { text: 'About', href: 'https://example.com/about' },
            ];
          }
          return undefined;
        }) as ChromeAPI['scripting']['executePageScript'],
      },
    });
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('links');
    expect(result.clickableList?.count).toBe(2);
    expect(result.clickableList?.command(1)).toBe('link 1');
  });

  it('downloads command exposes click actions', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('downloads');
    expect(result.clickableList?.count).toBeGreaterThan(0);
    expect(result.clickableList?.command(1)).toBe('downloads show 1');
  });
});