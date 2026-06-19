import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { ShellExecutor } from '@/shell/executor';
import { getRegistry } from '@/shell/registry';

describe('command registry', () => {
  it('registers all MVP commands', () => {
    registerAllCommands();
    const registry = getRegistry();
    const names = registry.getNames();

    const expected = [
      'help', 'man', 'apropos', 'ls', 'cd', 'pwd', 'cat', 'echo', 'clear',
      'source', 'alias', 'export', 'grep', 'head', 'tail', 'wc',
      'tabs', 'tab', 'bookmarks', 'bookmark', 'history', 'open', 'close', 'config',
      'windows', 'window', 'sessions', 'find', 'detach', 'mute',
      'go', 'qf', 'here', 'reload', 'back', 'forward', 'clip', 'quick',
      'ai',
    ];

    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('every command has examples', () => {
    registerAllCommands();
    for (const cmd of getRegistry().getAll()) {
      expect(cmd.examples.length).toBeGreaterThanOrEqual(1);
      expect(cmd.usage).toBeTruthy();
      expect(cmd.description).toBeTruthy();
    }
  });
});

describe('shell executor', () => {
  it('executes echo with env expansion', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: () => {},
    });
    await executor.initialize();

    const result = await executor.execute('echo $HOME');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('/');
  });

  it('executes help for tab command', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: () => {},
    });
    await executor.initialize();

    const result = await executor.execute('help tab');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('tab switch');
  });

  it('handles unknown commands with suggestions', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: () => {},
    });
    await executor.initialize();

    const result = await executor.execute('hep');
    expect(result.exitCode).toBe(127);
    expect(result.stderr).toContain('not found');
  });

  it('executes pipelines', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: () => {},
    });
    await executor.initialize();

    const result = await executor.execute('echo hello | grep hel');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello');
  });

  it('only prints the last command in a pipeline', async () => {
    registerAllCommands();
    const outputs: string[] = [];
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: (_s, text) => outputs.push(text),
    });
    await executor.initialize();

    await executor.execute('echo before | grep before');
    const joined = outputs.join('');
    expect(joined).not.toContain('before\nbefore');
    expect(joined).toContain('before');
  });

  it('counts piped lines with wc', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: () => {},
    });
    await executor.initialize();

    const plain = await executor.execute('ls -1 /tabs | wc -l');
    expect(plain.exitCode).toBe(0);
    expect(plain.stdout).toBe('2');

    const auto = await executor.execute('tabs | wc -l');
    expect(auto.exitCode).toBe(0);
    expect(auto.stdout).toBe('2');
  });

  it('rejects invalid grep patterns', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: () => {},
    });
    await executor.initialize();

    const result = await executor.execute('echo test | grep [invalid');
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('invalid pattern');
  });

  it('defaults history to recent', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: () => {},
    });
    await executor.initialize();

    const result = await executor.execute('history');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Example');
  });

  it('accepts unquoted alias', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: () => {},
    });
    await executor.initialize();

    const result = await executor.execute('alias ll=tabs');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ll');
  });

  it('opens bookmark by search rank', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({
      chrome: createMockChromeAPI(),
      onOutput: () => {},
    });
    await executor.initialize();

    await executor.execute('bookmark search project');
    const result = await executor.execute('bookmark open 1');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Opened (tab|new tab)/);
  });
});