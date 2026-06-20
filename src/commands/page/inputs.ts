import { defineCommand } from '../define';
import { error, formatTable, success } from '@/shell/output';
import { clickableFooter, emptyListHint } from '../shared/list-hints';
import { filterFlags, getFlagValue } from '../shared/args';
import { fetchPageInputs } from '../shared/input-utils';
import { isScriptError, resolvePageTab } from '../shared/page-utils';

export const inputs = defineCommand({
  name: 'inputs',
  description: 'List form fields on the current page.',
  usage: 'inputs [pattern] [--limit N] [#]',
  examples: ['inputs', 'inputs email', 'inputs search', 'inputs && input fill 1 "query"'],
  category: 'utility',
  seeAlso: ['input', 'fill', 'press'],
  notes: 'Numbers match input <#>. Workflow: inputs → input fill 1 "text"',
  handler: async (args, ctx) => {
    const limit = Math.min(100, Math.max(1, Number(getFlagValue(args, '--limit') ?? '50')));
    const parts = filterFlags(args).filter((a) => !a.startsWith('--'));
    let tabArg: string | undefined;
    if (parts.length > 1 && /^\d+@\d+$/.test(parts[parts.length - 1]!)) tabArg = parts.pop();
    const pattern = parts.join(' ').trim();

    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const result = await fetchPageInputs(resolved.ref.id, ctx, pattern, limit);
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    if (!result.length) {
      return { stdout: emptyListHint('inputs', pattern ? `"${pattern}"` : undefined), exitCode: 0 };
    }

    ctx.setLastInputsResults?.(result);

    if (ctx.piped) {
      return {
        stdout: result.map((i, n) => `${n + 1}\t${i.label}\t${i.type}\t${i.name}`).join('\n'),
        exitCode: 0,
      };
    }

    const rows = result.map((i, n) => [String(n + 1), i.type, i.label.slice(0, 28), i.placeholder.slice(0, 20) || i.name.slice(0, 20)]);
    return {
      stdout:
        formatTable(['#', 'Type', 'Label', 'Hint'], rows, {
          maxWidth: ctx.cols,
          clickable: { command: (n) => `input focus ${n}` },
        }) +
        clickableFooter('input focus <#>') +
        `\n${success('Fill: input 1 "text"  |  Clear: input 1 clear  |  press enter')}`,
      exitCode: 0,
      clickableList: {
        count: result.length,
        command: (n) => `input focus ${n}`,
      },
    };
  },
});