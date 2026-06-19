import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { longestCommonPrefix, parseCompletionInput } from '@/shell/completion';
import { VirtualFileSystem } from '@/vfs';

describe('completion', () => {
  it('parses the last pipeline segment', () => {
    const ctx = parseCompletionInput('tabs | grep git');
    expect(ctx.commandName).toBe('grep');
    expect(ctx.currentWord).toBe('git');
    expect(ctx.completingCommand).toBe(false);
  });

  it('finds longest common prefix', () => {
    expect(longestCommonPrefix(['tab', 'tabs', 'tail'])).toBe('ta');
    expect(longestCommonPrefix(['bookmark', 'bookmarks'])).toBe('bookmark');
  });

  it('completes vfs paths from partial input', async () => {
    registerAllCommands();
    const vfs = new VirtualFileSystem(createMockChromeAPI());
    const { completeVfsPath } = await import('@/shell/completion');
    const matches = await completeVfsPath('/book', '/', vfs);
    expect(matches.some((m) => m.includes('bookmarks'))).toBe(true);
  });
});