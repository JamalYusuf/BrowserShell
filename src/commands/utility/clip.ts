import { defineCommand } from '../define';
import { filterFlags } from '../shared/args';
import { currentTab } from '../shared/navigation';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';
import { readTranscript } from '@/shell/transcript';
import { truncateTitle } from '../shared/text';
import { error, success } from '@/shell/output';

async function copyText(text: string, label: string): Promise<{ stdout: string; exitCode: number } | { stderr: string; exitCode: number }> {
  try {
    await navigator.clipboard.writeText(text);
    return { stdout: success(`Copied ${label}: ${truncateTitle(text)}`), exitCode: 0 };
  } catch {
    return { stderr: error('Clipboard access denied.'), exitCode: 1 };
  }
}

export const clip = defineCommand({
  name: 'clip',
  description: 'Copy tab URL, title, markdown link, or page selection to clipboard.',
  usage: 'clip [url|title|md|both|selection|log]',
  examples: ['clip', 'clip md', 'clip both', 'clip selection', 'clip log', 'pick | clip'],
  category: 'utility',
  seeAlso: ['here', 'pick'],
  handler: async (args, ctx) => {
    const what = filterFlags(args)[0] ?? 'url';
    if (what === 'log' || what === 'transcript') {
      const text = readTranscript();
      if (!text || text.startsWith('(empty session')) {
        return { stderr: error('No session transcript yet. Run a few commands first.'), exitCode: 1 };
      }
      return copyText(text, 'session log');
    }

    const tab = await currentTab(ctx);
    if (!tab && what !== 'selection') return { stderr: error('No active tab.'), exitCode: 1 };

    if (what === 'selection' || what === 'sel') {
      const resolved = await resolvePageTab([], ctx);
      if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };
      const text = await runPageScript(resolved.ref.id, ctx, 'getSelectionText');
      if (isScriptError(text)) return { stderr: error(text.error), exitCode: 1 };
      const selection = text as string;
      if (!selection.trim()) return { stderr: error('No text selected on page.'), exitCode: 1 };
      return copyText(selection, 'selection');
    }

    if (what === 'title') return copyText(tab!.title, 'title');
    if (what === 'url') return copyText(tab!.url, 'url');
    if (what === 'md' || what === 'markdown') {
      return copyText(`[${tab!.title}](${tab!.url})`, 'markdown');
    }
    if (what === 'both') {
      return copyText(`${tab!.title}\n${tab!.url}`, 'title+url');
    }

    return { stderr: error('Usage: clip [url|title|md|both|selection|log]'), exitCode: 2 };
  },
});