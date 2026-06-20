import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { ShellExecutor } from '@/shell/executor';

describe('history privacy commands', () => {
  it('parses history clear domain (not as search)', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('history clear jamal.dev -f');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('jamal.dev');
    expect(result.stdout).not.toContain('No history for');
  });

  it('requires -f for history delete', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('history delete 1');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('-f');
  });

  it('registers forget command', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('forget');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('-f');
    expect(result.stderr).not.toContain('not found');
  });
});