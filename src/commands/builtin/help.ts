import { defineCommand } from '../define';
import { ANSI, color, error, heading } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { formatCommandHelp } from '@/shell/executor';
import { getRegistry } from '@/shell/registry';
import { BUILD_STAMP, BUILD_VERSION } from '@/shared/build-info';

const HELP_GROUPS: { label: string; names?: string[]; categories?: string[] }[] = [
  { label: 'SHELL', categories: ['builtin'] },
  { label: 'NAVIGATION', categories: ['navigation'] },
  { label: 'TABS & WINDOWS', categories: ['tabs'] },
  { label: 'BOOKMARKS', categories: ['bookmarks'] },
  { label: 'HISTORY', categories: ['history'] },
  { label: 'PRIVACY', names: ['forget', 'siteinfo', 'permissions', 'cookies', 'storage'] },
  { label: 'DOWNLOADS', names: ['downloads'] },
  { label: 'EXTENSIONS', names: ['extensions'] },
  { label: 'SESSIONS', names: ['session', 'sessions', 'recent'] },
  { label: 'PAGE', names: ['hints', 'link', 'links', 'input', 'inputs', 'image', 'images', 'click', 'fill', 'press', 'scroll', 'read', 'meta', 'seek', 'shot', 'pick', 'clip'] },
  { label: 'DEV TOOLS', names: ['audit', 'perf', 'tech', 'reqs', 'viewport', 'frames', 'jsonld', 'env'] },
  { label: 'AI', categories: ['ai'] },
  { label: 'UTILITY', categories: ['utility'] },
  { label: 'CONFIG', categories: ['config'] },
  { label: 'PROCESSES', categories: ['process'] },
  { label: 'WORKSPACES', categories: ['workspace'] },
];

export const help = defineCommand({
  name: 'help',
  description: 'Show command overview or help for a specific command.',
  usage: 'help [command|category]',
  examples: ['help', 'help tab', 'help privacy', 'help downloads', 'help ls | grep tab'],
  category: 'builtin',
  seeAlso: ['man', 'apropos', 'quick'],
  handler: async (args) => {
    const registry = getRegistry();
    if (args.includes('--help')) {
      return { stdout: formatCommandHelp(help), exitCode: 0 };
    }

    const target = filterFlags(args)[0];
    if (target) {
      const cmd = registry.resolve(target);
      if (cmd) return { stdout: formatCommandHelp(cmd), exitCode: 0 };

      const CATEGORY_ALIASES: Record<string, string[]> = {
        privacy: ['forget', 'siteinfo', 'permissions', 'cookies', 'storage', 'history'],
        extensions: ['extensions'],
        page: HELP_GROUPS.find((g) => g.label === 'PAGE')!.names!,
        dev: HELP_GROUPS.find((g) => g.label === 'DEV TOOLS')!.names!,
        downloads: ['downloads'],
        session: ['session', 'sessions'],
      };

      const names = CATEGORY_ALIASES[target];
      if (names) {
        const cmds = names.map((n) => registry.resolve(n)).filter(Boolean);
        const lines = [heading(`${target.toUpperCase()} commands`), ''];
        for (const c of cmds) {
          lines.push(`  ${color(c!.name, ANSI.cyan).padEnd(18)} ${c!.description}`);
        }
        return { stdout: lines.join('\n'), exitCode: 0 };
      }

      return { stderr: error(`Unknown command: ${target}. Try 'apropos ${target}' or 'help privacy'.`), exitCode: 1 };
    }

    const lines = [
      heading('BrowserShell — Command Reference'),
      color(`v${BUILD_VERSION} · build ${BUILD_STAMP}`, ANSI.dim),
      '',
      'Type `man intro` for a tour. `quick` for workflows. Press ` to toggle.',
      '',
    ];

    const shown = new Set<string>();
    for (const group of HELP_GROUPS) {
      const cmds = group.categories
        ? registry.getAll().filter((c) => group.categories!.includes(c.category))
        : (group.names ?? []).map((n) => registry.resolve(n)).filter((c): c is NonNullable<typeof c> => !!c);

      const unique = cmds.filter((c) => !shown.has(c.name));
      if (!unique.length) continue;
      unique.forEach((c) => shown.add(c.name));

      lines.push(heading(group.label));
      for (const cmd of unique) {
        lines.push(`  ${color(cmd.name, ANSI.cyan).padEnd(18)} ${cmd.description}`);
      }
      lines.push('');
    }

    lines.push(color('Tip: help privacy · help page · help downloads', ANSI.dim));
    return { stdout: lines.join('\n'), exitCode: 0 };
  },
});