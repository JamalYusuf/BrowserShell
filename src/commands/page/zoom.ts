import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { resolvePageTab } from '../shared/page-utils';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const STEP = 0.1;

function parseZoomFactor(arg: string | undefined, current: number): number | undefined {
  if (!arg || arg === 'reset') return 1;
  if (arg === 'in') return Math.min(MAX_ZOOM, Math.round((current + STEP) * 100) / 100);
  if (arg === 'out') return Math.max(MIN_ZOOM, Math.round((current - STEP) * 100) / 100);
  const pct = Number(arg.replace('%', ''));
  if (!Number.isNaN(pct) && pct > 0) return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pct / 100));
  return undefined;
}

export const zoom = defineCommand({
  name: 'zoom',
  description: 'Show, set, or adjust page zoom.',
  usage: 'zoom [in|out|reset|<percent>] [#]',
  examples: ['zoom', 'zoom in', 'zoom 125', 'zoom out 2'],
  category: 'utility',
  seeAlso: ['here', 'scroll'],
  notes: 'No arguments shows the current zoom level.',
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    const maybeTab = parts[0] && /^\d+(@\d+)?$/.test(parts[0]) && parts.length > 1 ? parts[0] : undefined;
    const zoomArg = maybeTab ? parts[1] : parts[0];
    const resolved = await resolvePageTab(maybeTab ? [maybeTab] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const current = await ctx.chrome.tabs.getZoom(resolved.ref.id);
    if (!zoomArg) {
      const pct = Math.round(current * 100);
      return { stdout: `#${resolved.ref.index} zoom ${pct}%`, exitCode: 0 };
    }

    const factor = parseZoomFactor(zoomArg, current);
    if (factor === undefined) return { stderr: error('Usage: zoom [in|out|reset|<percent>] [#]'), exitCode: 2 };

    await ctx.chrome.tabs.setZoom(resolved.ref.id, factor);
    const pct = Math.round(factor * 100);
    return { stdout: success(`#${resolved.ref.index} zoom ${pct}%`), exitCode: 0 };
  },
});