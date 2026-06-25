import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';

export const touch = defineCommand({
  name: 'touch',
  description: 'Create an empty file or update an existing writable VFS path.',
  usage: 'touch <path>...',
  examples: [
    'touch /notes/todo.md',
    'touch /scripts/morning.sh',
    'touch /notes/ideas.txt && edit /notes/ideas.txt',
  ],
  category: 'builtin',
  seeAlso: ['edit', 'cat', 'ls', 'mkdir'],
  notes: 'Works on writable VFS paths: /notes/, /scripts/, /config/bangs/.',
  handler: async (args, ctx) => {
    const paths = filterFlags(args).filter((p) => !p.startsWith('-'));
    if (!paths.length) return { stderr: error('Usage: touch <path>...'), exitCode: 2 };

    const created: string[] = [];
    const existing: string[] = [];

    for (const path of paths) {
      const resolved = ctx.vfs.resolve(path, ctx.cwd);
      let exists = false;
      try {
        await ctx.vfs.stat(resolved);
        exists = true;
      } catch {
        exists = false;
      }

      if (exists) {
        existing.push(resolved);
        continue;
      }

      try {
        await ctx.vfs.write(resolved, '');
        created.push(resolved);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const hint =
          resolved.startsWith('/notes/') ||
          resolved.startsWith('/scripts/') ||
          resolved.startsWith('/config/')
            ? ''
            : ' Try /notes/name.txt, /scripts/name.sh, or /config/rc.';
        return { stderr: error(`touch: ${resolved}: ${msg}.${hint}`), exitCode: 1 };
      }
    }

    const parts: string[] = [];
    if (created.length) parts.push(`created ${created.join(', ')}`);
    if (existing.length) parts.push(`exists ${existing.join(', ')}`);
    return { stdout: success(parts.join(' · ') || 'done'), exitCode: 0 };
  },
});