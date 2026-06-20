import { defineCommand } from '../define';
import { ANSI, color, error } from '@/shell/output';
import { filterFlags, getFlagValue } from '../shared/args';
import { explainText, getTextContent, summarizeText } from '../shared/ai-utils';

export const ai = defineCommand({
  name: 'ai',
  description: 'AI-powered summarization and explanation using built-in browser AI.',
  usage: 'ai <summarize|explain> [target] [--length short|medium|long]',
  examples: [
    'ai summarize',
    'ai summarize current --length short',
    'cat /current/content.txt | ai summarize',
    'ai explain "TypeError: Cannot read property"',
  ],
  category: 'ai',
  seeAlso: ['cat', 'grep'],
  notes: 'Uses Chrome built-in AI when available. Falls back to excerpts when unavailable.',
  handler: async (args, ctx) => {
    const sub = filterFlags(args)[0];
    const rest = filterFlags(args).slice(1);
    const length = getFlagValue(args, '--length') ?? 'medium';

    if (!sub || sub === '--help') {
      return {
        stdout: [
          color('ai summarize', ANSI.cyan) + ' — Summarize page content',
          color('ai explain', ANSI.cyan) + ' — Explain text or errors',
          '',
          'Examples:',
          '  ai summarize current --length short',
          '  cat /current/content.txt | ai summarize',
          '  ai explain "error message here"',
        ].join('\n'),
        exitCode: 0,
      };
    }

    if (sub === 'summarize') {
      let text = ctx.stdin;
      if (!text) {
        const path = rest[0] ?? 'current';
        try {
          text = await getTextContent(path, ctx);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { stderr: error(msg), exitCode: 1 };
        }
      }

      if (!text.trim()) return { stderr: error('No content to summarize.'), exitCode: 1 };

      const summary = await summarizeText(text, length, ctx);
      return { stdout: summary, exitCode: 0 };
    }

    if (sub === 'explain') {
      let text = rest.join(' ') || ctx.stdin;
      if (!text || text === 'current') {
        try {
          text = await getTextContent('current', ctx);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { stderr: error(msg), exitCode: 1 };
        }
      }

      if (!text.trim()) return { stderr: error('No text to explain.'), exitCode: 1 };

      const explanation = await explainText(text, ctx);
      return { stdout: explanation, exitCode: 0 };
    }

    return { stderr: error(`Unknown ai subcommand: ${sub}. Try: summarize, explain`), exitCode: 2 };
  },
});