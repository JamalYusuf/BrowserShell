import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { formatEditorHelp } from '@/terminal/editor';

const WRITABLE_PREFIXES = ['/notes/', '/scripts/', '/config/bangs/', '/config/rc', '/current/inputs/'];

function isWritablePath(path: string): boolean {
  return WRITABLE_PREFIXES.some((p) => path === p.slice(0, -1) || path.startsWith(p));
}

export const edit = defineCommand({
  name: 'edit',
  description: 'Open the built-in terminal editor for a VFS path or stdin.',
  usage: 'edit [path|-] [--help]',
  examples: [
    'edit',
    'touch /notes/todo.md && edit /notes/todo.md',
    'edit /config/rc',
    'cat /current/content.txt | edit -',
  ],
  category: 'utility',
  seeAlso: ['touch', 'cat', 'bang', 'config', 'edit-bind'],
  notes: 'Arrow keys to move, type to edit. Ctrl+S or :w to save, Esc or :q to exit. touch <path> for new files.',
  handler: async (args, ctx) => {
    const words = filterFlags(args);
    if (words.includes('--help')) {
      return { stdout: formatEditorHelp(), exitCode: 0 };
    }

    let path = words[0];
    let content = '';

    if (path === '-') {
      content = ctx.stdin;
      path = '[stdin]';
    } else if (path) {
      const resolved = ctx.vfs.resolve(path, ctx.cwd);
      try {
        content = (await ctx.vfs.read(resolved)) as string;
        path = resolved;
      } catch {
        if (isWritablePath(resolved)) {
          content = '';
          path = resolved;
        } else {
          return {
            stderr: error(`Cannot open ${resolved}. Use touch for new notes/scripts, or check the path.`),
            exitCode: 1,
          };
        }
      }
    } else {
      path = '[No Name]';
    }

    return {
      stdout: success(`Opening editor: ${path}`),
      exitCode: 0,
      structured: {
        editor: true,
        path,
        content,
      },
    };
  },
});