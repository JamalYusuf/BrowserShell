import { defineCommand } from '../define';
import { filterFlags } from '../shared/args';
import { resolveTabRef } from '../shared/tab-utils';
import { error, success } from '@/shell/output';

export const mute = defineCommand({
  name: 'mute',
  description: 'Mute or unmute tab audio.',
  usage: 'mute [on|off|toggle] [#]',
  examples: ['mute', 'mute off', 'mute on 2'],
  category: 'utility',
  seeAlso: ['volume', 'audible', 'tab'],
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    const mode = parts[0] && ['on', 'off', 'toggle'].includes(parts[0]) ? parts[0] : 'toggle';
    const tabArg = parts[0] && !['on', 'off', 'toggle'].includes(parts[0]) ? parts[0] : parts[1] ?? 'current';
    const ref = await resolveTabRef(tabArg === mode ? 'current' : tabArg, ctx);
    if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };

    const tab = await ctx.chrome.tabs.get(ref.id);
    let muted = tab?.muted ?? false;
    if (mode === 'on') muted = true;
    else if (mode === 'off') muted = false;
    else muted = !muted;

    await ctx.chrome.tabs.update(ref.id, { muted });
    return { stdout: success(`#${ref.index} ${muted ? 'muted' : 'unmuted'}`), exitCode: 0 };
  },
});