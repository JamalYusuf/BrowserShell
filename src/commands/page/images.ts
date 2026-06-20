import { defineCommand } from '../define';
import { error, formatTable, success } from '@/shell/output';
import { clickableFooter, emptyListHint } from '../shared/list-hints';
import { filterFlags, getFlagValue } from '../shared/args';
import { fetchPageImages } from '../shared/image-utils';
import { isScriptError, resolvePageTab } from '../shared/page-utils';

export const images = defineCommand({
  name: 'images',
  description: 'List images on the current page.',
  usage: 'images [pattern] [--limit N] [#]',
  examples: ['images', 'images logo', 'images hero', 'images | head -n 5'],
  category: 'utility',
  seeAlso: ['image', 'shot', 'meta'],
  notes: 'Numbers match image <#>. Workflow: images → image open 1',
  handler: async (args, ctx) => {
    const limit = Math.min(100, Math.max(1, Number(getFlagValue(args, '--limit') ?? '40')));
    const parts = filterFlags(args).filter((a) => !a.startsWith('--'));
    let tabArg: string | undefined;
    if (parts.length > 1 && /^\d+@\d+$/.test(parts[parts.length - 1]!)) tabArg = parts.pop();
    const pattern = parts.join(' ').trim();

    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const result = await fetchPageImages(resolved.ref.id, ctx, pattern, limit);
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    if (!result.length) {
      return { stdout: emptyListHint('images', pattern ? `"${pattern}"` : undefined), exitCode: 0 };
    }

    ctx.setLastImagesResults?.(result);

    if (ctx.piped) {
      return {
        stdout: result.map((i, n) => `${n + 1}\t${i.alt}\t${i.src}`).join('\n'),
        exitCode: 0,
      };
    }

    const rows = result.map((i, n) => [String(n + 1), i.alt.slice(0, 24), i.src.slice(0, 42)]);
    return {
      stdout:
        formatTable(['#', 'Alt', 'URL'], rows, {
          maxWidth: ctx.cols,
          clickable: { command: (n) => `image open ${n}` },
        }) +
        clickableFooter('image open <#>') +
        `\n${success('Copy: image 1 copy')}`,
      exitCode: 0,
      clickableList: {
        count: result.length,
        command: (n) => `image open ${n}`,
      },
    };
  },
});