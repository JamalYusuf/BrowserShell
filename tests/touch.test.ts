import { describe, expect, it } from 'vitest';
import { touch } from '@/commands/builtin/touch';
import { createMockChromeAPI } from '@/chrome/api';
import { VirtualFileSystem } from '@/vfs';
import type { ExecutionContext } from '@/shared/types';

function mockCtx(vfs: VirtualFileSystem): ExecutionContext {
  return {
    vfs,
    chrome: createMockChromeAPI(),
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

describe('touch', () => {
  it('creates a new note file', async () => {
    const vfs = new VirtualFileSystem(createMockChromeAPI());
    const result = await touch.handler(['/notes/new-file.txt'], mockCtx(vfs));
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('created');
    const content = await vfs.read('/notes/new-file.txt');
    expect(content).toBe('');
  });
});