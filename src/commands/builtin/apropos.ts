import { defineCommand } from '../define';
import { ANSI, color, error } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { getRegistry } from '@/shell/registry';

export const apropos = defineCommand({
  name: 'apropos',
  description: 'Search commands by keyword in name, description, or examples.',
  usage: 'apropos <keyword>',
  examples: ['apropos tab', 'apropos bookmark', 'apropos ai'],
  category: 'builtin',
  seeAlso: ['help', 'man'],
  handler: async (args) => {
    const keyword = filterFlags(args)[0];
    if (!keyword) return { stderr: error('Usage: apropos <keyword>'), exitCode: 2 };

    const matches = getRegistry().search(keyword);
    if (!matches.length) return { stderr: error(`No commands found for "${keyword}".`), exitCode: 1 };

    return { stdout: matches.map((c) => `${color(c.name, ANSI.cyan)} — ${c.description}`).join('\n'), exitCode: 0 };
  },
});