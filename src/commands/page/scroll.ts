import { defineCommand } from '../define';
import { error, formatViewport, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import type { ViewportInfo } from '../shared/dev-scripts';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

function parseScrollAction(arg: string | undefined): { action: string; amount: number } | undefined {
  if (!arg) return undefined;
  const lower = arg.toLowerCase();
  if (['top', 'bottom', 'up', 'down'].includes(lower)) {
    return { action: lower, amount: lower === 'up' || lower === 'down' ? 400 : 0 };
  }
  if (arg.startsWith('+')) {
    const px = Number(arg.slice(1));
    return { action: 'px', amount: Number.isNaN(px) ? 400 : px };
  }
  if (arg.startsWith('-')) {
    const px = Number(arg.slice(1));
    return { action: 'px', amount: Number.isNaN(px) ? -400 : -px };
  }
  const px = Number(arg);
  if (!Number.isNaN(px)) return { action: 'px', amount: px };
  return undefined;
}

export const scroll = defineCommand({
  name: 'scroll',
  description: 'Show scroll position or scroll the page.',
  usage: 'scroll | scroll [top|bottom|up|down|<px>] [#]',
  examples: ['scroll', 'scroll down', 'scroll top', 'scroll 800', 'scroll down 2'],
  category: 'utility',
  seeAlso: ['viewport', 'seek', 'zoom'],
  notes: 'No arguments shows scroll position (like zoom).',
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    const maybeTab = parts[0] && /^\d+(@\d+)?$/.test(parts[0]) && parts.length > 1 ? parts[0] : undefined;
    const scrollArg = maybeTab ? parts[1] : parts[0];

    const resolved = await resolvePageTab(maybeTab ? [maybeTab] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    if (!scrollArg) {
      const vp = await runPageScript(resolved.ref.id, ctx, 'getViewportInfo');
      if (isScriptError(vp)) return { stderr: error(vp.error), exitCode: 1 };
      return { stdout: formatViewport(vp as ViewportInfo), exitCode: 0, structured: vp };
    }

    const parsed = parseScrollAction(scrollArg);
    if (!parsed) return { stderr: error('Usage: scroll | scroll [top|bottom|up|down|<px>] [#]'), exitCode: 2 };

    const result = await runPageScript(resolved.ref.id, ctx, 'scrollPage', parsed.action, parsed.amount);
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    const scroll = result as { y: number; max: number };

    const pct = scroll.max > 0 ? Math.round((scroll.y / scroll.max) * 100) : 0;
    return { stdout: success(`Scrolled #${resolved.ref.index} — ${parsed.action} (${pct}% of page)`), exitCode: 0 };
  },
});