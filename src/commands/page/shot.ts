import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { getActiveWindowId } from '../shared/window-utils';
import { resolvePageTab } from '../shared/page-utils';

export const shot = defineCommand({
  name: 'shot',
  description: 'Capture a screenshot of the current window.',
  usage: 'shot [--copy] [#]',
  examples: ['shot', 'shot --copy'],
  category: 'utility',
  seeAlso: ['clip', 'here'],
  handler: async (args, ctx) => {
    const copy = hasFlag(args, '--copy');
    const tabArg = filterFlags(args).find((a) => /^\d+(@\d+)?$/.test(a));
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const winId = (await ctx.chrome.tabs.get(resolved.ref.id))?.windowId ?? await getActiveWindowId(ctx);
    const dataUrl = await ctx.chrome.tabs.captureVisibleTab(winId);

    if (copy) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        return { stdout: success(`Screenshot copied — #${resolved.ref.index}`), exitCode: 0 };
      } catch {
        return { stderr: error('Clipboard copy failed. Screenshot captured but not copied.'), exitCode: 1 };
      }
    }

    return {
      stdout: success(`Screenshot captured — #${resolved.ref.index} (${Math.round(dataUrl.length / 1024)}KB data URL)`),
      exitCode: 0,
      structured: { dataUrl, tabId: resolved.ref.id },
    };
  },
});