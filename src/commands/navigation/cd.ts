import { defineCommand } from '../define';
import { error } from '@/shell/output';
import { filterFlags } from '../shared/args';

export const cd = defineCommand({
  name: 'cd',
  description: 'Change the current working directory in the virtual filesystem.',
  usage: 'cd [path]',
  examples: ['cd /tabs', 'cd /bookmarks', 'cd /current', 'cd ..'],
  category: 'navigation',
  seeAlso: ['pwd', 'ls'],
  handler: async (args, ctx) => {
    const target = filterFlags(args)[0] ?? '/';
    const resolved = ctx.vfs.resolve(target, ctx.cwd);

    try {
      const stat = await ctx.vfs.stat(resolved);
      if (stat.type !== 'directory') {
        return { stderr: error(`cd: not a directory: ${target}`), exitCode: 1 };
      }
      ctx.setCwd(resolved);
      return { stdout: '', exitCode: 0 };
    } catch {
      return { stderr: error(`cd: no such directory: ${target}`), exitCode: 1 };
    }
  },
});