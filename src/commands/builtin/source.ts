import { defineCommand } from '../define';
import { ANSI, color, error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';

export const source = defineCommand({
  name: 'source',
  description: 'Execute commands from a script file.',
  usage: 'source <script>',
  examples: ['source /scripts/welcome.sh', 'source /config/rc'],
  category: 'builtin',
  seeAlso: ['alias', 'export'],
  handler: async (args, ctx) => {
    const path = filterFlags(args)[0];
    if (!path) return { stderr: error('Usage: source <script>'), exitCode: 2 };

    try {
      const content = (await ctx.vfs.read(ctx.vfs.resolve(path, ctx.cwd))) as string;
      const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      if (!lines.length) {
        return { stdout: color(`Script ${path} is empty or contains only comments.`, ANSI.dim), exitCode: 0 };
      }

      const preview = lines.map((l) => color(`> ${l}`, ANSI.dim)).join('\n');
      return {
        stdout: `${preview}\n${success(`Running ${lines.length} command(s) from ${path}…`)}`,
        exitCode: 0,
        structured: { commands: lines },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { stderr: error(msg), exitCode: 1 };
    }
  },
});