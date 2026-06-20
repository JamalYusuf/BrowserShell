import { defineCommand } from '../define';
import { error, success, warn } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

function parseVolumeAction(arg: string | undefined): { action: string; value: number } {
  if (!arg || arg === 'status') return { action: 'status', value: 0 };
  if (arg === 'mute') return { action: 'mute', value: 0 };
  if (arg === 'unmute') return { action: 'unmute', value: 0 };
  if (arg.startsWith('+')) return { action: 'up', value: Number(arg.slice(1)) || 10 };
  if (arg.startsWith('-')) return { action: 'down', value: Number(arg.slice(1)) || 10 };
  const pct = Number(arg);
  if (!Number.isNaN(pct)) return { action: 'set', value: Math.max(0, Math.min(100, pct)) };
  return { action: 'status', value: 0 };
}

export const volume = defineCommand({
  name: 'volume',
  description: 'Control in-page media volume (video/audio elements). Tab mute: see mute.',
  usage: 'volume [status|mute|unmute|0-100|+N|-N] [#]',
  examples: ['volume', 'volume 50', 'volume mute', 'volume +10', 'volume -20'],
  category: 'utility',
  seeAlso: ['mute', 'audible'],
  notes: 'Controls HTML5 media on the page. Use mute for tab-level audio mute.',
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    const maybeTab = parts[0] && /^\d+(@\d+)?$/.test(parts[0]) && parts.length > 1 ? parts[0] : undefined;
    const volArg = maybeTab ? parts[1] : parts[0];
    const { action, value } = parseVolumeAction(volArg);

    const resolved = await resolvePageTab(maybeTab ? [maybeTab] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const result = await runPageScript(resolved.ref.id, ctx, 'setPageVolume', action, value);
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    const vol = result as { media: number; volume: number | null; muted: boolean };

    if (!vol.media) {
      return { stdout: warn(`No video/audio on #${resolved.ref.index}. Try audible for noisy tabs.`), exitCode: 0 };
    }

    if (action === 'status') {
      const pct = vol.volume !== null ? Math.round(vol.volume * 100) : 0;
      const state = vol.muted ? 'muted' : `${pct}%`;
      return { stdout: `#${resolved.ref.index} media volume: ${state} (${vol.media} element${vol.media === 1 ? '' : 's'})`, exitCode: 0 };
    }

    const pct = vol.volume !== null ? Math.round(vol.volume * 100) : 0;
    const state = vol.muted ? 'muted' : `${pct}%`;
    return { stdout: success(`#${resolved.ref.index} volume → ${state}`), exitCode: 0 };
  },
});