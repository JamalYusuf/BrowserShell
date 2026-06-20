import type { ExtensionInfo } from '@/chrome/api';
import type { ExecutionContext } from '@/shared/types';
import { filterFlags } from './args';

export type ExtensionAction = 'list' | 'enable' | 'disable' | 'options';

export interface ParsedExtensionArgs {
  action: ExtensionAction;
  target?: string;
  query: string;
}

const ACTIONS = new Set(['enable', 'disable', 'options', 'open']);

export function parseExtensionArgs(args: string[]): ParsedExtensionArgs {
  const positional = filterFlags(args);
  const first = positional[0];

  if (!first) {
    return { action: 'list', query: '' };
  }

  if (ACTIONS.has(first)) {
    const action = first === 'open' ? 'options' : (first as ExtensionAction);
    return { action, target: positional[1], query: '' };
  }

  return { action: 'list', query: positional.join(' ').trim() };
}

export async function listExtensions(ctx: ExecutionContext, query: string): Promise<ExtensionInfo[]> {
  const all = await ctx.chrome.management.getAll();
  const sorted = all.sort((a, b) => a.name.localeCompare(b.name));
  if (!query) return sorted;
  const lower = query.toLowerCase();
  return sorted.filter(
    (ext) =>
      ext.name.toLowerCase().includes(lower) ||
      ext.id.toLowerCase().includes(lower) ||
      ext.description?.toLowerCase().includes(lower)
  );
}

export function resolveExtensionTarget(
  target: string | undefined,
  cached: ExtensionInfo[]
): ExtensionInfo | { error: string } {
  if (!target) return { error: 'Usage: extensions <enable|disable|options> <#|id|name>' };

  if (/^\d+$/.test(target)) {
    const item = cached[Number(target) - 1];
    if (!item) return { error: `Extension #${target} not found. Run extensions first.` };
    return item;
  }

  const lower = target.toLowerCase();
  const byId = cached.find((ext) => ext.id === target);
  if (byId) return byId;

  const byName = cached.filter((ext) => ext.name.toLowerCase().includes(lower));
  if (byName.length === 1) return byName[0]!;
  if (byName.length > 1) {
    return { error: `Ambiguous name "${target}" (${byName.length} matches). Use # from extensions list.` };
  }

  return { error: `Extension "${target}" not found. Run extensions first.` };
}