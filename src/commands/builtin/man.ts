import { defineCommand } from '../define';
import { error, formatManPage } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { getRegistry } from '@/shell/registry';
import { CURATED_MAN_PAGES } from '../man-pages';

export const man = defineCommand({
  name: 'man',
  description: 'Display formatted manual page for a command or guide.',
  usage: 'man <command|guide>',
  examples: ['man ls', 'man tab', 'man intro', 'man vfs'],
  category: 'builtin',
  seeAlso: ['help', 'apropos'],
  handler: async (args) => {
    const target = filterFlags(args)[0];
    if (!target) return { stderr: error('Usage: man <command|guide>'), exitCode: 2 };

    const curated = CURATED_MAN_PAGES[target];
    if (curated) return { stdout: formatManPage(target, curated.sections), exitCode: 0 };

    const cmd = getRegistry().resolve(target);
    if (!cmd) return { stderr: error(`No manual entry for "${target}". Try 'apropos ${target}'.`), exitCode: 1 };

    const sections = [
      { heading: 'NAME', content: `${cmd.name} — ${cmd.description}` },
      { heading: 'SYNOPSIS', content: cmd.usage },
      { heading: 'DESCRIPTION', content: cmd.description + (cmd.notes ? `\n\n${cmd.notes}` : '') },
      { heading: 'EXAMPLES', content: cmd.examples.map((e) => `  $ ${e}`).join('\n') },
      { heading: 'SEE ALSO', content: (cmd.seeAlso ?? []).join(', ') || 'help' },
    ];
    return { stdout: formatManPage(cmd.name, sections), exitCode: 0 };
  },
});