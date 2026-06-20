import type { HistoryItem } from '@/chrome/api';
import type { ExecutionContext } from '@/shared/types';
import { originFromHost, tabDomain } from './url';
import { filterFlags } from './args';

export type HistoryAction = 'list' | 'delete' | 'clear';

export type HistoryRange =
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this-week';

export interface ParsedHistoryArgs {
  action: HistoryAction;
  query: string;
  range?: HistoryRange;
  limit: number;
}

const HISTORY_SUBS = new Set(['recent', 'search', 'delete', 'clear', 'rm', 'remove']);

const RANGE_WORDS = new Set<HistoryRange>([
  'hour',
  'day',
  'week',
  'month',
  'all',
  'today',
  'yesterday',
  'this-week',
]);

function normalizeRange(word: string): HistoryRange {
  const lower = word.toLowerCase();
  if (lower === 'thisweek' || lower === 'this_week') return 'this-week';
  return lower as HistoryRange;
}

function startOfDay(date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(date = new Date()): number {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function parseHistoryArgs(args: string[]): ParsedHistoryArgs {
  const limit = Math.min(500, Math.max(1, Number(args.find((a) => a.startsWith('--limit='))?.slice(8) ?? 15)));
  const positional = filterFlags(args).filter((a) => !a.startsWith('--limit'));
  let sub = positional[0];
  let rest = positional.slice(1);

  if (!sub || sub === 'recent') {
    return { action: 'list', query: '', limit };
  }

  if (sub === 'search') {
    return { action: 'list', query: rest.join(' ').trim(), limit };
  }

  if (sub === 'delete' || sub === 'rm' || sub === 'remove') {
    return { action: 'delete', query: rest.join(' ').trim(), limit };
  }

  if (sub === 'clear') {
    const target = rest[0];
    if (!target) {
      return { action: 'clear', query: '', range: 'day', limit };
    }
    const normalized = normalizeRange(target);
    if (RANGE_WORDS.has(normalized)) {
      return { action: 'clear', query: '', range: normalized, limit };
    }
    return { action: 'clear', query: rest.join(' ').trim(), range: undefined, limit };
  }

  if (HISTORY_SUBS.has(sub)) {
    return { action: 'list', query: rest.join(' ').trim(), limit };
  }

  const normalized = normalizeRange(sub);
  if (RANGE_WORDS.has(normalized)) {
    return { action: 'list', query: rest.join(' ').trim(), range: normalized, limit };
  }

  return { action: 'list', query: [sub, ...rest].join(' ').trim(), limit };
}

export function rangeToTimes(range: NonNullable<ParsedHistoryArgs['range']>): { startTime: number; endTime: number } {
  const endTime = Date.now();
  const now = new Date();

  if (range === 'today') {
    return { startTime: startOfDay(now), endTime };
  }
  if (range === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { startTime: startOfDay(yesterday), endTime: startOfDay(now) };
  }
  if (range === 'this-week') {
    return { startTime: startOfWeek(now), endTime };
  }
  if (range === 'all') {
    return { startTime: 0, endTime };
  }

  const offsets: Record<string, number> = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };
  const ms = offsets[range] ?? offsets.day!;
  return { startTime: endTime - ms, endTime };
}

export function formatHistoryRange(range: HistoryRange): string {
  if (range === 'today') return 'today';
  if (range === 'yesterday') return 'yesterday';
  if (range === 'this-week') return 'this week';
  if (range === 'all') return 'all time';
  return `last ${range}`;
}

export async function searchHistory(
  ctx: ExecutionContext,
  query: string,
  limit: number,
  range?: HistoryRange
): Promise<HistoryItem[]> {
  const search: { text: string; maxResults: number; startTime?: number; endTime?: number } = {
    text: query,
    maxResults: limit,
  };
  if (range) {
    const { startTime, endTime } = rangeToTimes(range);
    search.startTime = startTime;
    if (range === 'yesterday') search.endTime = endTime;
  }
  return ctx.chrome.history.search(search);
}

export async function deleteHistoryUrls(ctx: ExecutionContext, urls: string[]): Promise<number> {
  const unique = [...new Set(urls.filter(Boolean))];
  for (const url of unique) {
    await ctx.chrome.history.deleteUrl(url);
  }
  return unique.length;
}

export async function deleteHistoryByQuery(ctx: ExecutionContext, query: string): Promise<number> {
  const items = await ctx.chrome.history.search({ text: query, maxResults: 5000 });
  const urls = items
    .map((i) => i.url)
    .filter((url) => {
      if (!query) return true;
      if (query.startsWith('http')) return url === query;
      const lower = query.toLowerCase();
      return url.toLowerCase().includes(lower) || tabDomain(url).includes(lower.replace(/^www\./, ''));
    });
  return deleteHistoryUrls(ctx, urls);
}

export async function resolveHistoryTarget(
  ctx: ExecutionContext,
  target: string
): Promise<{ urls: string[] } | { error: string }> {
  if (!target) return { error: 'Usage: history delete <#|url|query>' };

  if (/^\d+$/.test(target)) {
    let list = ctx.getLastHistoryResults?.() ?? [];
    if (!list.length) list = await searchHistory(ctx, '', 100);
    const item = list[Number(target) - 1];
    if (!item) return { error: `History #${target} not found. Run history first.` };
    return { urls: [item.url] };
  }

  if (target.startsWith('http')) {
    return { urls: [target] };
  }

  const items = await searchHistory(ctx, target, 5000);
  const urls = [...new Set(items.map((i) => i.url))];
  if (!urls.length) return { error: `No history matching "${target}".` };
  return { urls };
}

export async function clearHistoryDomain(ctx: ExecutionContext, domain: string): Promise<number> {
  const host = domain.replace(/^www\./, '');
  const items = await ctx.chrome.history.search({ text: host, maxResults: 5000 });
  const urls = items
    .map((i) => i.url)
    .filter((url) => tabDomain(url).replace(/^www\./, '') === host || url.includes(host));
  return deleteHistoryUrls(ctx, urls);
}

export function historyOriginFromQuery(query: string): string | undefined {
  if (!query) return undefined;
  if (query.startsWith('http')) {
    try {
      return new URL(query).origin;
    } catch {
      return undefined;
    }
  }
  return originFromHost(query);
}