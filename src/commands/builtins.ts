import type { Command } from '@/shared/types';
import { expandVariables } from '@/shell/parser';
import {
  ANSI,
  color,
  error,
  formatBookmarkListing,
  formatDirListing,
  formatHistoryListing,
  formatJson,
  formatManPage,
  formatTabList,
  heading,
  success,
} from '@/shell/output';
import type { VFSEntry } from '@/shared/types';
import { formatCommandHelp } from '@/shell/executor';
import { getRegistry } from '@/shell/registry';
import { filterFlags, getFlagValue, hasFlag } from './args';
import { getActiveWindowId, getWindowTabs, tabListItems } from './tab-utils';
import { CURATED_MAN_PAGES } from './man-pages';

export function createBuiltinCommands(): Command[] {
  return [
    {
      name: 'help',
      description: 'Show command overview or help for a specific command.',
      usage: 'help [command]',
      examples: ['help', 'help tab', 'help ls | grep tab'],
      category: 'builtin',
      seeAlso: ['man', 'apropos'],
      handler: async (args) => {
        const registry = getRegistry();
        if (args.includes('--help')) {
          return { stdout: formatCommandHelp(createBuiltinCommands()[0]!), exitCode: 0 };
        }

        const target = filterFlags(args)[0];
        if (target) {
          const cmd = registry.resolve(target);
          if (!cmd) {
            return { stderr: error(`Unknown command: ${target}. Try 'apropos ${target}'.`), exitCode: 1 };
          }
          return { stdout: formatCommandHelp(cmd), exitCode: 0 };
        }

        const categories = ['builtin', 'tabs', 'bookmarks', 'history', 'navigation', 'ai', 'utility'] as const;
        const lines = [
          heading('BrowserShell — Command Reference'),
          '',
          'Type `man intro` for a quick tour. Press ` to toggle the terminal.',
          '',
        ];

        for (const cat of categories) {
          const cmds = registry.getAll().filter((c) => c.category === cat);
          if (!cmds.length) continue;
          lines.push(heading(cat.toUpperCase()));
          for (const cmd of cmds) {
            lines.push(`  ${color(cmd.name, ANSI.cyan).padEnd(20)} ${cmd.description}`);
          }
          lines.push('');
        }

        lines.push(color('Quick start:  go github  →  qf mail  →  quick  (cheat sheet)', ANSI.dim));
        return { stdout: lines.join('\n'), exitCode: 0 };
      },
    },
    {
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
    },
    {
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
    },
    {
      name: 'ls',
      description: 'List directory contents in the virtual filesystem.',
      usage: 'ls [path] [-1] [--json]',
      examples: ['ls', 'ls /tabs', 'ls -1 /tabs | grep github', 'ls /bookmarks'],
      category: 'builtin',
      notes: 'Use -1 for plain one-per-line output (ideal for pipes). Bare ls lists the current directory.',
      seeAlso: ['cd', 'cat', 'pwd', 'tabs'],
      handler: async (args, ctx) => {
        const json = hasFlag(args, '--json');
        const onePerLine = hasFlag(args, '-1') || ctx.piped;
        const positional = filterFlags(args).filter((a) => a !== '-1');
        const path = ctx.vfs.resolve(positional[0] ?? '.', ctx.cwd);

        try {
          const entries = await ctx.vfs.readdir(path);

          if (path === '/tabs' || path.startsWith('/tabs/')) {
            const winId = await getActiveWindowId(ctx);
            const tabs = await getWindowTabs(ctx.chrome, winId);
            if (json) return { stdout: formatJson(tabs), exitCode: 0, structured: tabs };
            if (onePerLine) {
              const lines = tabListItems(tabs).map((t) =>
                `${t.index}\t${t.title}\t${t.url}${t.active ? '\t*' : ''}${t.pinned ? '\tP' : ''}`
              );
              return { stdout: lines.join('\n'), exitCode: 0 };
            }
            return { stdout: formatTabList(tabListItems(tabs), ctx.cols), exitCode: 0 };
          }

          if (path === '/bookmarks' || path.startsWith('/bookmarks/')) {
            if (json) return { stdout: formatJson(entries), exitCode: 0, structured: entries };
            if (onePerLine) {
              const lines = entries.map((e) => bookmarkPlainLine(e));
              return { stdout: lines.join('\n'), exitCode: 0 };
            }
            return {
              stdout: formatBookmarkListing(
                entries.map((e) => ({
                  name: e.name,
                  title: (e.meta?.title as string) ?? e.name,
                  type: e.type === 'directory' ? 'directory' : 'file',
                  url: e.meta?.url as string | undefined,
                })),
                ctx.cols
              ),
              exitCode: 0,
            };
          }

          if (path === '/history' || path.startsWith('/history/')) {
            if (json) return { stdout: formatJson(entries), exitCode: 0, structured: entries };
            if (onePerLine) {
              const lines = entries.map((e) => historyPlainLine(e));
              return { stdout: lines.join('\n'), exitCode: 0 };
            }
            return {
              stdout: formatHistoryListing(
                entries.map((e) => ({
                  index: (e.meta?.index as number) ?? 0,
                  title: (e.meta?.title as string) ?? e.name,
                  url: (e.meta?.url as string) ?? '',
                  when: (e.meta?.when as string) ?? '',
                })),
                ctx.cols
              ),
              exitCode: 0,
            };
          }

          if (json) return { stdout: formatJson(entries), exitCode: 0, structured: entries };

          if (onePerLine) {
            const lines = entries.map((e) => (e.type === 'directory' ? `${e.name}/` : e.name));
            return { stdout: lines.join('\n'), exitCode: 0 };
          }

          const listing = formatDirListing(entries.map((e) => ({ name: e.name, type: e.type })), ctx.cols);
          const footer =
            path === '/'
              ? `\n${color('cd <dir> to enter — e.g. cd tabs, cd bookmarks', ANSI.dim)}`
              : `\n${color(`${entries.length} item${entries.length === 1 ? '' : 's'}`, ANSI.dim)}`;
          return { stdout: listing + footer, exitCode: 0 };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { stderr: error(msg), exitCode: 1 };
        }
      },
    },
    {
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
    },
    {
      name: 'pwd',
      description: 'Print the current working directory.',
      usage: 'pwd',
      examples: ['pwd', 'cd /tabs && pwd'],
      category: 'navigation',
      seeAlso: ['cd', 'ls'],
      handler: async (_args, ctx) => ({ stdout: ctx.cwd, exitCode: 0 }),
    },
    {
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
    },
    {
      name: 'echo',
      description: 'Print arguments to stdout (supports $VAR expansion).',
      usage: 'echo [text...]',
      examples: ['echo Hello', 'echo $HOME', 'echo $USER'],
      category: 'builtin',
      handler: async (args, ctx) => ({
        stdout: expandVariables(args.join(' '), ctx.env),
        exitCode: 0,
      }),
    },
    {
      name: 'clear',
      description: 'Clear the terminal screen.',
      usage: 'clear',
      examples: ['clear'],
      category: 'builtin',
      handler: async () => ({ stdout: '\x1b[2J\x1b[H', exitCode: 0 }),
    },
    {
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
          if (!lines.length) return { stdout: warnEmptyScript(path), exitCode: 0 };

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
    },
    {
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
    },
    {
      name: 'export',
      description: 'Set an environment variable.',
      usage: 'export VAR=value',
      examples: ['export MY_VAR=hello', 'export HOME=/'],
      category: 'builtin',
      seeAlso: ['alias'],
      handler: async (args, ctx) => {
        const input = args.join(' ');
        const match = input.match(/^(?:export\s+)?(\w+)=(.*)$/);
        if (!match) return { stderr: error('Usage: export VAR=value'), exitCode: 2 };
        ctx.setEnv(match[1]!, match[2]!);
        return { stdout: '', exitCode: 0 };
      },
    },
    {
      name: 'grep',
      description: 'Filter lines matching a pattern from stdin or a file.',
      usage: 'grep [-i] [-v] <pattern> [path]',
      examples: ['tabs | grep -i youtube', 'history | grep github', 'tabs | grep -v example'],
      category: 'utility',
      seeAlso: ['cat', 'tabs', 'head', 'wc'],
      handler: async (args, ctx) => {
        const ignoreCase = hasFlag(args, '-i');
        const invert = hasFlag(args, '-v');
        const positional = filterFlags(args).filter((a) => a !== '-i' && a !== '-v');
        const pattern = positional[0];
        const path = positional[1];

        if (!pattern) return { stderr: error('Usage: grep [-i] [-v] <pattern> [path]'), exitCode: 2 };

        let text = ctx.stdin;
        if (path) {
          try {
            text = (await ctx.vfs.read(ctx.vfs.resolve(path, ctx.cwd))) as string;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { stderr: error(msg), exitCode: 1 };
          }
        }

        if (!text.trim()) return { stderr: error('grep: no input. Pipe data or specify a path.'), exitCode: 1 };

        try {
          const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
          const lines = text.split('\n').filter((l) => {
            const matches = regex.test(l);
            return invert ? !matches : matches;
          });
          return { stdout: lines.join('\n'), exitCode: lines.length ? 0 : 1 };
        } catch {
          return { stderr: error(`grep: invalid pattern: ${pattern}`), exitCode: 2 };
        }
      },
    },
    {
      name: 'head',
      description: 'Output the first N lines of input.',
      usage: 'head [-n N]',
      examples: ['tabs | head -n 5', 'history | head -n 3'],
      category: 'utility',
      seeAlso: ['tail', 'grep', 'wc'],
      handler: async (args, ctx) => {
        const n = Math.max(1, Number(getFlagValue(args, '-n') ?? '10'));
        if (!ctx.stdin.trim()) return { stderr: error('head: no input. Pipe data in.'), exitCode: 1 };
        const lines = ctx.stdin.split('\n').slice(0, n);
        return { stdout: lines.join('\n'), exitCode: 0 };
      },
    },
    {
      name: 'tail',
      description: 'Output the last N lines of input.',
      usage: 'tail [-n N]',
      examples: ['history | tail -n 5', 'tabs | tail -n 3'],
      category: 'utility',
      seeAlso: ['head', 'grep'],
      handler: async (args, ctx) => {
        const n = Math.max(1, Number(getFlagValue(args, '-n') ?? '10'));
        if (!ctx.stdin.trim()) return { stderr: error('tail: no input. Pipe data in.'), exitCode: 1 };
        const lines = ctx.stdin.split('\n');
        return { stdout: lines.slice(-n).join('\n'), exitCode: 0 };
      },
    },
    {
      name: 'wc',
      description: 'Count lines, words, or characters in input.',
      usage: 'wc [-l] [-w] [path]',
      examples: ['tabs | wc -l', 'history | wc -l', 'wc -l /config/rc'],
      category: 'utility',
      seeAlso: ['grep', 'head'],
      handler: async (args, ctx) => {
        const countLines = hasFlag(args, '-l') || (!hasFlag(args, '-w') && !hasFlag(args, '-c'));
        const countWords = hasFlag(args, '-w');
        const path = filterFlags(args).find((a) => !a.startsWith('-'));

        let text = ctx.stdin;
        if (path) {
          try {
            text = (await ctx.vfs.read(ctx.vfs.resolve(path, ctx.cwd))) as string;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { stderr: error(msg), exitCode: 1 };
          }
        }

        if (!text && !path) return { stderr: error('wc: no input. Pipe data or specify a path.'), exitCode: 1 };

        const parts: string[] = [];
        if (countLines) parts.push(String(text.split('\n').filter((l) => l.trim()).length));
        if (countWords) parts.push(String(text.split(/\s+/).filter(Boolean).length));

        return { stdout: parts.join('\t'), exitCode: 0 };
      },
    },
  ];
}

function warnEmptyScript(path: string): string {
  return color(`Script ${path} is empty or contains only comments.`, ANSI.dim);
}

function bookmarkPlainLine(e: VFSEntry): string {
  const title = (e.meta?.title as string) ?? e.name;
  const url = (e.meta?.url as string) ?? '';
  return e.type === 'directory'
    ? `${e.name}/\tfolder\t${title}`
    : `${e.name}\tlink\t${title}\t${url}`;
}

function historyPlainLine(e: VFSEntry): string {
  const index = (e.meta?.index as number) ?? 0;
  const title = (e.meta?.title as string) ?? e.name;
  const url = (e.meta?.url as string) ?? '';
  return `${index}\t${title}\t${url}`;
}