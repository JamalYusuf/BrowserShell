import { defineCommand } from '../define';
import { error, success } from '@/shell/output';

export const alias = defineCommand({
  name: 'alias',
  description: 'Define or list command aliases.',
  usage: "alias [name='command']",
  examples: ["alias ll='tabs'", 'alias', "alias gh='tab new https://github.com'"],
  category: 'builtin',
  seeAlso: ['export', 'source'],
  handler: async (args, ctx) => {
    const input = args.join(' ').trim();
    if (!input || input === '--help') {
      const lines = Object.entries(ctx.aliases).map(([k, v]) => `alias ${k}='${v}'`);
      return { stdout: lines.length ? lines.join('\n') : '(no aliases defined)', exitCode: 0 };
    }

    const quoted = input.match(/^(\w+)=['"](.+)['"]\s*$/);
    const bare = input.match(/^(\w+)=(.+)$/);
    const match = quoted ?? bare;
    if (!match) return { stderr: error("Usage: alias name='command'  or  alias name=command"), exitCode: 2 };

    ctx.setAlias(match[1]!, match[2]!.trim());
    return { stdout: success(`Alias ${match[1]}='${match[2]!.trim()}'`), exitCode: 0 };
  },
});