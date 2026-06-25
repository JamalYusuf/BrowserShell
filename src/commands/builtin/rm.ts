import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';

const WRITABLE_PREFIXES = ['/notes/', '/scripts/', '/config/bangs/'];

function isRemovablePath(path: string): boolean {
  return WRITABLE_PREFIXES.some((p) => path.startsWith(p));
}

export const rm = defineCommand({
  name: 'rm',
  description: 'Remove user-writable VFS files (notes, scripts, custom bangs).',
  usage: 'rm <path>... [-f] [--dry-run]',
  examples: [
    'rm /notes/old-draft.md',
    'rm /scripts/tmp.sh',
    'rm /config/bangs/mywiki.txt -f',
    'ls /notes | grep draft | xargs rm -f',
  ],
  category: 'builtin',
  seeAlso: ['touch', 'edit', 'ls', 'bang remove'],
  notes: 'Builtin scripts and /config/rc cannot be removed. Use bang remove for bangs.',
  handler: async (args, ctx) => {
    const paths = filterFlags(args).filter((p) => !p.startsWith('-'));
    const force = hasFlag(args, '-f') || hasFlag(args, '--force');
    const dryRun = hasFlag(args, '--dry-run');

    if (!paths.length) return { stderr: error('Usage: rm <path>... [-f]'), exitCode: 2 };

    const removed: string[] = [];
    for (const path of paths) {
      const resolved = ctx.vfs.resolve(path, ctx.cwd);
      if (!isRemovablePath(resolved)) {
        return {
          stderr: error(`rm: cannot remove ${resolved}. Only /notes/, /scripts/, /config/bangs/ are removable.`),
          exitCode: 1,
        };
      }

      let exists = false;
      try {
        await ctx.vfs.stat(resolved);
        exists = true;
      } catch {
        exists = false;
      }

      if (!exists) {
        if (force) continue;
        return { stderr: error(`rm: ${resolved}: No such file`), exitCode: 1 };
      }

      if (dryRun) {
        removed.push(resolved);
        continue;
      }

      try {
        await ctx.vfs.unlink(resolved);
        removed.push(resolved);
      } catch (e) {
        return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
      }
    }

    if (dryRun) {
      return { stdout: `Would remove: ${removed.join(', ')}`, exitCode: 0 };
    }
    return { stdout: success(`Removed ${removed.length} file(s): ${removed.join(', ')}`), exitCode: 0 };
  },
});