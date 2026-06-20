import type { ExecutionContext } from '@/shared/types';
import { error } from '@/shell/output';
import type { PageScriptName } from './page-script-registry';
import { resolveTabRef } from './tab-utils';

export function isScriptError(result: unknown): result is { error: string } {
  return typeof result === 'object' && result !== null && 'error' in result;
}

export async function resolvePageTab(args: string[], ctx: ExecutionContext) {
  const tabArg = args.find((a) => !a.startsWith('-')) ?? 'current';
  const ref = await resolveTabRef(tabArg, ctx);
  if (!ref) return { ref: undefined, error: error('Invalid tab. Run "tabs" for numbers.') };
  return { ref, error: undefined };
}

export async function runPageScript(
  tabId: number,
  ctx: ExecutionContext,
  name: PageScriptName,
  ...args: unknown[]
): Promise<unknown> {
  try {
    const result = await ctx.chrome.scripting.executePageScript(tabId, name, args);
    if (result === null || result === undefined) {
      return { error: 'Page script returned no result. Reload the tab and try again.' };
    }
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg.includes('Cannot access') ? 'Cannot script this page. Try a regular http(s) tab.' : msg };
  }
}