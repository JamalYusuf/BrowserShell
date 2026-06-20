import { defineCommand } from '../define';
import { filterFlags } from '../shared/args';
import { error } from '@/shell/output';

export const wait = defineCommand({
  name: 'wait',
  description: 'Pause for milliseconds (useful in scripts and chained workflows).',
  usage: 'wait <ms>',
  examples: ['wait 500', 'wait 2000', 'tab new example.com && wait 1000 && here'],
  category: 'utility',
  seeAlso: ['source', 'reload'],
  handler: async (args) => {
    const ms = Number(filterFlags(args)[0]);
    if (!ms || ms < 0 || ms > 60_000) {
      return { stderr: error('Usage: wait <ms>  (1–60000)'), exitCode: 2 };
    }
    await new Promise((r) => setTimeout(r, ms));
    return { stdout: '', exitCode: 0 };
  },
});