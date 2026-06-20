import { defineCommand } from '../define';
import { error, success } from '@/shell/output';

export const optionsPage = defineCommand({
  name: 'options',
  description: 'Open the BrowserShell settings / options page.',
  usage: 'options',
  examples: ['options'],
  category: 'utility',
  aliases: ['settings', 'prefs'],
  seeAlso: ['config', 'help', 'overlay'],
  handler: async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
        await chrome.runtime.openOptionsPage();
        return { stdout: success('Opened BrowserShell options.'), exitCode: 0 };
      }
    } catch {
      /* fall through */
    }
    return { stderr: error('Could not open options page.'), exitCode: 1 };
  },
});