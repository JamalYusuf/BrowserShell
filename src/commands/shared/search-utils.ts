import type { ChromeAPI, DownloadInfo, HistoryItem, TabInfo } from '@/chrome/api';
import type { ExecutionContext } from '@/shared/types';
import { fuzzyFilter } from '@/shell/fuzzy';
import { tabDomain } from './url';

export type SearchScope = 'all' | 'tabs' | 'bookmarks' | 'history' | 'downloads';

export interface SearchHit {
  kind: SearchScope;
  title: string;
  subtitle: string;
  command: string;
}

export function parseSearchArgs(args: string[]): { query: string; scope: SearchScope } {
  const parts = [...args];
  let scope: SearchScope = 'all';
  if (parts[0] === '--tabs') {
    scope = 'tabs';
    parts.shift();
  } else if (parts[0] === '--bookmarks' || parts[0] === '--bm') {
    scope = 'bookmarks';
    parts.shift();
  } else if (parts[0] === '--history') {
    scope = 'history';
    parts.shift();
  } else if (parts[0] === '--downloads') {
    scope = 'downloads';
    parts.shift();
  }
  return { query: parts.join(' ').trim(), scope };
}

async function searchTabs(chrome: ChromeAPI, query: string): Promise<SearchHit[]> {
  const tabs = await chrome.tabs.query({});
  const filtered = fuzzyFilter(tabs, query, (t) => `${t.title} ${t.url}`);
  return filtered.slice(0, 20).map((t: TabInfo) => ({
    kind: 'tabs' as const,
    title: t.title,
    subtitle: t.url,
    command: `tab switch ${t.index + 1}@${t.windowId}`,
  }));
}

async function searchBookmarks(chrome: ChromeAPI, query: string): Promise<SearchHit[]> {
  const all = query ? await chrome.bookmarks.search(query) : [];
  const filtered = query
    ? fuzzyFilter(all.filter((b) => b.url), query, (b) => `${b.title} ${b.url ?? ''}`)
    : all.filter((b) => b.url).slice(0, 20);
  return filtered.slice(0, 20).map((b) => ({
    kind: 'bookmarks' as const,
    title: b.title,
    subtitle: b.url ?? '',
    command: `go ${b.url}`,
  }));
}

async function searchHistoryItems(chrome: ChromeAPI, query: string): Promise<SearchHit[]> {
  const items = await chrome.history.search({ text: query, maxResults: 30 });
  const filtered = fuzzyFilter(items, query, (h) => `${h.title} ${h.url}`);
  return filtered.slice(0, 20).map((h: HistoryItem) => ({
    kind: 'history' as const,
    title: h.title,
    subtitle: h.url,
    command: `go ${h.url}`,
  }));
}

async function searchDownloadItems(chrome: ChromeAPI, query: string): Promise<SearchHit[]> {
  const items = await chrome.downloads.search(query ? { query: [query], limit: 30, orderBy: ['-startTime'] } : { limit: 30, orderBy: ['-startTime'] });
  const filtered = fuzzyFilter(items, query, (d) => `${d.filename} ${d.url}`);
  return filtered.slice(0, 20).map((d: DownloadInfo, i) => ({
    kind: 'downloads' as const,
    title: d.filename,
    subtitle: d.state,
    command: `downloads show ${i + 1}`,
  }));
}

export async function unifiedSearch(ctx: ExecutionContext, query: string, scope: SearchScope): Promise<SearchHit[]> {
  if (!query) return [];

  const hits: SearchHit[] = [];
  if (scope === 'all' || scope === 'tabs') hits.push(...(await searchTabs(ctx.chrome, query)));
  if (scope === 'all' || scope === 'bookmarks') hits.push(...(await searchBookmarks(ctx.chrome, query)));
  if (scope === 'all' || scope === 'history') hits.push(...(await searchHistoryItems(ctx.chrome, query)));
  if (scope === 'all' || scope === 'downloads') hits.push(...(await searchDownloadItems(ctx.chrome, query)));

  if (scope === 'all') {
    return hits.slice(0, 25);
  }
  return hits;
}

export function domainHits(_ctx: ExecutionContext, query: string): SearchHit[] {
  const host = tabDomain(query.startsWith('http') ? query : `https://${query}`);
  return [
    {
      kind: 'history',
      title: `siteinfo ${host}`,
      subtitle: 'audit site footprint',
      command: `siteinfo ${host}`,
    },
    {
      kind: 'history',
      title: `forget ${host} --dry-run`,
      subtitle: 'preview site wipe',
      command: `forget ${host} --dry-run`,
    },
  ];
}