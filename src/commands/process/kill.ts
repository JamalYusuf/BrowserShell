import { defineCommand } from '../define';
import { ps } from './ps';
import { error, formatJson, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { getAllWindows, getWindowTabs } from '../shared/window-utils';
import { truncateTitle } from '../shared/text';

async function resolveTabTarget(
  target: string,
  ctx: import('@/shared/types').ExecutionContext,
): Promise<{ id: number; title: string } | null> {
  const wins = await getAllWindows(ctx.chrome);
  const all: { id: number; title: string; index: number }[] = [];
  for (const w of wins) {
    const tabs = await getWindowTabs(ctx.chrome, w.id);
    tabs.forEach((t) => all.push({ id: t.id, title: t.title, index: all.length + 1 }));
  }

  if (/^\d+$/.test(target)) {
    const n = Number(target);
    const byRank = all[n - 1];
    if (byRank) return { id: byRank.id, title: byRank.title };
    const byPid = all.find((t) => t.id === n);
    if (byPid) return { id: byPid.id, title: byPid.title };
  }
  return null;
}

export const kill = defineCommand({
  name: 'kill',
  description: 'Close a tab by list number or tab ID (PID).',
  usage: 'kill <n|tab-id> [-9] [--dry-run]',
  examples: ['ps', 'kill 3', 'kill 142857 -9', 'kill 7 --dry-run'],
  category: 'process',
  seeAlso: ['pkill', 'ps', 'tab close'],
  handler: async (args, ctx) => {
    const words = filterFlags(args);
    const target = words[0];
    const dryRun = hasFlag(args, '--dry-run');
    if (!target) return { stderr: error('Usage: kill <n|tab-id>'), exitCode: 2 };

    const tab = await resolveTabTarget(target, ctx);
    if (!tab) return { stderr: error(`No tab found for: ${target}. Run ps first.`), exitCode: 1 };

    if (dryRun) {
      return { stdout: `Would close tab ${tab.id}: ${truncateTitle(tab.title)}`, exitCode: 0 };
    }

    await ctx.chrome.tabs.remove(tab.id);
    return { stdout: success(`Killed tab ${tab.id} — ${truncateTitle(tab.title)}`), exitCode: 0 };
  },
});

export const pkill = defineCommand({
  name: 'pkill',
  description: 'Close tabs matching a title or URL pattern.',
  usage: 'pkill <pattern> [-f] [--dry-run] [--json]',
  examples: ['pkill youtube', 'pkill github -f', 'pkill ads --dry-run'],
  category: 'process',
  seeAlso: ['kill', 'ps', 'tabs'],
  handler: async (args, ctx) => {
    const words = filterFlags(args);
    const pattern = words.join(' ').trim();
    const dryRun = hasFlag(args, '--dry-run');
    const json = hasFlag(args, '--json');
    if (!pattern) return { stderr: error('Usage: pkill <pattern>'), exitCode: 2 };

    const q = pattern.toLowerCase();
    const wins = await getAllWindows(ctx.chrome);
    const matches: { id: number; title: string; url: string }[] = [];

    for (const w of wins) {
      const tabs = await getWindowTabs(ctx.chrome, w.id);
      for (const t of tabs) {
        if (t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)) {
          matches.push({ id: t.id, title: t.title, url: t.url });
        }
      }
    }

    if (!matches.length) return { stderr: error(`No tabs match: ${pattern}`), exitCode: 1 };
    if (dryRun) {
      const out = matches.map((m) => `${m.id}\t${truncateTitle(m.title)}`).join('\n');
      return { stdout: `Would close ${matches.length} tab(s):\n${out}`, exitCode: 0 };
    }

    await ctx.chrome.tabs.remove(matches.map((m) => m.id));
    if (json) return { stdout: formatJson(matches), exitCode: 0, structured: matches };
    return { stdout: success(`Closed ${matches.length} tab(s) matching "${pattern}"`), exitCode: 0 };
  },
});

export const top = defineCommand({
  name: 'top',
  description: 'Live-updating tab process view (refreshes every 2s until Ctrl+C or watch stop).',
  usage: 'top [--json] [--once]',
  examples: ['top', 'top --once', 'watch 2 top', 'ps'],
  category: 'process',
  seeAlso: ['ps', 'watch', 'kill'],
  handler: async (args, ctx) => {
    const result = await ps.handler(args, ctx);
    if (hasFlag(args, '--once')) return result;
    return {
      ...result,
      watch: { intervalMs: 2000, command: 'top' },
    };
  },
});

export const renice = defineCommand({
  name: 'renice',
  description: 'Change tab priority (pin/unpin as nice value proxy).',
  usage: 'renice <n|tab-id> <priority>',
  examples: ['renice 3 -5', 'renice 142857 10'],
  category: 'process',
  seeAlso: ['ps', 'pin', 'unpin'],
  handler: async (args, ctx) => {
    const words = filterFlags(args);
    const target = words[0];
    const priority = Number(words[1]);
    if (!target || !Number.isFinite(priority)) {
      return { stderr: error('Usage: renice <n|tab-id> <priority>  (negative = pin)'), exitCode: 2 };
    }

    const tab = await resolveTabTarget(target, ctx);
    if (!tab) return { stderr: error(`No tab found for: ${target}`), exitCode: 1 };

    const pinned = priority < 0;
    await ctx.chrome.tabs.update(tab.id, { pinned });
    return {
      stdout: success(`${pinned ? 'Pinned' : 'Unpinned'} tab ${tab.id} (priority ${priority})`),
      exitCode: 0,
    };
  },
});