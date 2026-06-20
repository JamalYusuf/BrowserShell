import { defineCommand } from '../define';
import { hasFlag } from '../shared/args';
import {
  getActiveWindowId,
  getAllWindows,
  windowListItems,
} from '../shared/window-utils';
import { formatJson, formatWindowList, warn } from '@/shell/output';

export const windows = defineCommand({
  name: 'windows',
  description: 'List browser windows (W#). Sets context for tabs/tab commands.',
  usage: 'windows [--json]',
  examples: ['windows', 'window focus 2', 'tabs', 'tab switch 1@2'],
  category: 'tabs',
  seeAlso: ['window', 'tabs', 'sessions'],
  handler: async (args, ctx) => {
    const json = hasFlag(args, '--json');
    const wins = await getAllWindows(ctx.chrome);
    if (!wins.length) return { stdout: warn('No windows open.'), exitCode: 0 };
    if (json) return { stdout: formatJson(wins), exitCode: 0 };

    const activeId = await getActiveWindowId(ctx);
    return {
      stdout: formatWindowList(windowListItems(wins), activeId, ctx.cols),
      exitCode: 0,
    };
  },
});