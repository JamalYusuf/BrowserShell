import type { DownloadInfo } from '@/chrome/api';
import type { ExecutionContext } from '@/shared/types';
import { filterFlags } from './args';

export type DownloadAction = 'list' | 'open' | 'show' | 'delete' | 'clear';

const ACTION_ALIASES = new Set(['open', 'show', 'delete', 'rm', 'remove', 'clear']);

export interface ParsedDownloadArgs {
  action: DownloadAction;
  target?: string;
  query: string;
  limit: number;
}

export function parseDownloadArgs(args: string[]): ParsedDownloadArgs {
  const positional = filterFlags(args).filter((a) => !a.startsWith('--limit'));
  const limit = Math.min(200, Math.max(1, Number(args.find((a) => a.startsWith('--limit='))?.slice(8) ?? '20')));
  const first = positional[0];

  if (!first) {
    return { action: 'list', query: '', limit };
  }

  if (first === 'clear') {
    return { action: 'clear', query: '', limit };
  }

  if (ACTION_ALIASES.has(first)) {
    const action = first === 'rm' || first === 'remove' ? 'delete' : (first as DownloadAction);
    return { action, target: positional[1], query: '', limit };
  }

  return { action: 'list', query: positional.join(' ').trim(), limit };
}

export async function searchDownloads(ctx: ExecutionContext, query: string, limit: number): Promise<DownloadInfo[]> {
  const items = await ctx.chrome.downloads.search(query ? { query: [query], limit, orderBy: ['-startTime'] } : { limit, orderBy: ['-startTime'] });
  return items;
}

export function assertDownloadReady(item: DownloadInfo, action: 'open' | 'show'): string | null {
  if (item.state && item.state !== 'complete') {
    return `Download still "${item.state}" — wait until complete, then try again.`;
  }
  if (item.exists === false) {
    return `File no longer on disk: ${item.filename}. Try another entry or re-download.`;
  }
  if (action === 'open' && !item.filename) {
    return 'Download has no saved file path.';
  }
  return null;
}

export async function resolveDownloadTarget(
  ctx: ExecutionContext,
  target: string | undefined,
  cached: DownloadInfo[]
): Promise<DownloadInfo | { error: string }> {
  if (!target) return { error: 'Usage: downloads <open|show|delete> <#>' };

  if (/^\d+$/.test(target)) {
    const n = Number(target);
    const byRank = cached[n - 1];
    if (byRank) return byRank;

    const byChromeId = cached.find((d) => d.id === n);
    if (byChromeId) return byChromeId;

    const fetched = await ctx.chrome.downloads.search({ id: n });
    if (fetched[0]) return fetched[0];

    return { error: `Download #${target} not found. Run downloads first.` };
  }

  const byId = cached.find((d) => String(d.id) === target);
  if (byId) return byId;
  return { error: `Download "${target}" not found. Run downloads first.` };
}

export function formatBytes(n: number): string {
  if (!n || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}