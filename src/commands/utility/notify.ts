import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';

export const notify = defineCommand({
  name: 'notify',
  description: 'Show a desktop notification.',
  usage: 'notify <message>',
  examples: ['notify Done!', 'downloads | notify "Check downloads"', 'wait 5000 && notify "Time\'s up"'],
  category: 'utility',
  seeAlso: ['wait', 'echo'],
  handler: async (args, _ctx) => {
    const message = filterFlags(args).join(' ').trim();
    if (!message) return { stderr: error('Usage: notify <message>'), exitCode: 2 };

    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: 'BrowserShell',
        message,
      });
      return { stdout: success(`Notified: ${message}`), exitCode: 0 };
    } catch (e) {
      return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
    }
  },
});