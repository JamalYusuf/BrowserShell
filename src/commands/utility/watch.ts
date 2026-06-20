import { defineCommand } from '../define';
import { error, success, warn } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { getWatch, startWatch, stopWatch } from '@/shell/watch-store';

export const watch = defineCommand({
  name: 'watch',
  description: 'Repeat a command on an interval (stop with watch stop).',
  usage: 'watch <seconds> <command> | watch stop | watch status',
  examples: ['watch 5 tabs --all', 'watch 2 downloads', 'watch stop'],
  category: 'utility',
  seeAlso: ['wait', 'tabs', 'downloads'],
  notes: 'Runs in the terminal overlay. Re-executes silently except for command output.',
  handler: async (args, _ctx) => {
    const parts = filterFlags(args);
    const sub = parts[0];

    if (sub === 'stop') {
      stopWatch();
      return { stdout: success('Watch stopped.'), exitCode: 0, watch: null };
    }

    if (sub === 'status') {
      const w = getWatch();
      if (!w) return { stdout: warn('No active watch.'), exitCode: 0 };
      return { stdout: `Watching every ${w.intervalMs / 1000}s: ${w.command}`, exitCode: 0 };
    }

    const seconds = Number(sub);
    const command = parts.slice(1).join(' ').trim();
    if (!Number.isFinite(seconds) || seconds < 1 || !command) {
      return { stderr: error('Usage: watch <seconds> <command> | watch stop'), exitCode: 2 };
    }

    const intervalMs = Math.min(300_000, Math.max(1000, Math.round(seconds * 1000)));
    startWatch(intervalMs, command);
    return {
      stdout: success(`Watching every ${intervalMs / 1000}s: ${command} (watch stop to end)`),
      exitCode: 0,
      watch: { intervalMs, command },
    };
  },
});