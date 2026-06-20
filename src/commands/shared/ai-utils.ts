import type { ExecutionContext } from '@/shared/types';
import { warn } from '@/shell/output';

export async function getTextContent(path: string | undefined, ctx: ExecutionContext): Promise<string> {
  if (!path || path === 'current') {
    return (await ctx.vfs.read('/current/content.txt')) as string;
  }
  const resolved = ctx.vfs.resolve(path, ctx.cwd);
  return (await ctx.vfs.read(resolved)) as string;
}

export async function summarizeText(text: string, length: string, ctx: ExecutionContext): Promise<string> {
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

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const count = length === 'short' ? 2 : length === 'long' ? 8 : 4;
  const excerpt = sentences.slice(0, count).join('. ').trim();
  return (
    warn('[AI unavailable — showing excerpt]\n\n') +
    (excerpt || text.slice(0, 500) + (text.length > 500 ? '...' : ''))
  );
}

export async function explainText(text: string, ctx: ExecutionContext): Promise<string> {
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