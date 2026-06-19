import type { Command, ExecutionContext } from '@/shared/types';
import { ANSI, color, error, warn } from '@/shell/output';
import { filterFlags, getFlagValue } from './args';

async function getTextContent(path: string | undefined, ctx: ExecutionContext): Promise<string> {
  if (!path || path === 'current') {
    return (await ctx.vfs.read('/current/content.txt')) as string;
  }
  const resolved = ctx.vfs.resolve(path, ctx.cwd);
  return (await ctx.vfs.read(resolved)) as string;
}

async function summarizeText(text: string, length: string, ctx: ExecutionContext): Promise<string> {
  const ai = ctx.chrome.ai?.summarizer;
  if (ai) {
    const availability = await ai.available();
    if (availability !== 'no') {
      try {
        const session = await ai.create({ type: 'tl;dr', length });
        const summary = await session.summarize(text);
        session.destroy();
        return summary;
      } catch {
        // fall through to fallback
      }
    }
  }

  // Graceful fallback when AI APIs unavailable
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const count = length === 'short' ? 2 : length === 'long' ? 8 : 4;
  const excerpt = sentences.slice(0, count).join('. ').trim();
  return (
    warn('[AI unavailable — showing excerpt]\n\n') +
    (excerpt || text.slice(0, 500) + (text.length > 500 ? '...' : ''))
  );
}

async function explainText(text: string, ctx: ExecutionContext): Promise<string> {
  const ai = ctx.chrome.ai?.prompt;
  if (ai) {
    const availability = await ai.available();
    if (availability !== 'no') {
      try {
        const session = await ai.create({
          systemPrompt: 'You are a helpful assistant that explains web content and errors clearly and concisely.',
        });
        const result = await session.prompt(`Explain the following:\n\n${text.slice(0, 8000)}`);
        session.destroy();
        return result;
      } catch {
        // fall through
      }
    }
  }

  return (
    warn('[AI unavailable — basic analysis]\n\n') +
    `This text contains ${text.split(/\s+/).length} words across ${text.split('\n').length} lines.\n\n` +
    `Preview: ${text.slice(0, 300)}${text.length > 300 ? '...' : ''}`
  );
}

export function createAICommands(): Command[] {
  return [
    {
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
    },
  ];
}