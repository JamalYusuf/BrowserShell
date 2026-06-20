import { defineCommand } from '../define';
import { error } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';

export const cat = defineCommand({
  name: 'cat',
  description: 'Display file contents from the virtual filesystem.',
  usage: 'cat <path> [--raw]',
  examples: ['cat /current/meta.json', 'cat /current/content.txt', 'cat /config/rc'],
  category: 'builtin',
  seeAlso: ['ls', 'grep'],
  handler: async (args, ctx) => {
    const raw = hasFlag(args, '--raw');
    const pathArg = filterFlags(args)[0];
    if (!pathArg) return { stderr: error('Usage: cat <path> [--raw]'), exitCode: 2 };

    const path = ctx.vfs.resolve(pathArg, ctx.cwd);
    try {
      const content = await ctx.vfs.read(path, { raw });
      return { stdout: typeof content === 'string' ? content : new TextDecoder().decode(content), exitCode: 0 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { stderr: error(msg), exitCode: 1 };
    }
  },
});