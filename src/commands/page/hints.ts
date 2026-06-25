import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import type { ChromeAPI } from '@/chrome/api';

async function dispatchHints(chrome: ChromeAPI, tabId: number, newTab: boolean): Promise<boolean> {
  const message = { type: 'browsershell-hints', newTab };
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch {
    try {
      await chrome.scripting.injectContentScript(tabId, ['content/overlay.js']);
      await chrome.tabs.sendMessage(tabId, message);
      return true;
    } catch {
      return false;
    }
  }
}

/** Trigger link hints on the active page via content script message. */
export const hints = defineCommand({
  name: 'hints',
  description: 'Show Vimium-style link hints on the current page.',
  usage: 'hints [--newtab]',
  examples: ['hints', 'hints --newtab', 'bind list'],
  category: 'page',
  seeAlso: ['links', 'link', 'bind', 'scroll'],
  handler: async (args, ctx) => {
    const newTab = args.includes('--newtab');
    const tabId = ctx.getHostTabId?.();
    const targetId = tabId ?? (await ctx.chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    if (!targetId) {
      return { stderr: error('No active tab.'), exitCode: 1 };
    }

    const ok = await dispatchHints(ctx.chrome, targetId, newTab);
    if (!ok) {
      return {
        stderr: error('Could not reach page. Reload the tab or visit a regular http(s) page.'),
        exitCode: 1,
      };
    }

    return {
      stdout: success(newTab ? 'Hints (new tab) — type a letter on the page.' : 'Hints — type a letter on the page.'),
      exitCode: 0,
    };
  },
});