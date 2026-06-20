import type { BrowsingDataTypes, ChromeAPI } from '@/chrome/api';
import type { ExecutionContext, ForgetPreset } from '@/shared/types';
import { loadConfig } from '@/shared/storage';
import { filterFlags, hasFlag } from './args';
import { clearHistoryDomain } from './history-utils';
import { isScriptError, resolvePageTab, runPageScript } from './page-utils';
import { originFromHost, originFromUrl, tabDomain } from './url';

export type ForgetScope = 'all' | 'cookies' | 'cache' | 'storage' | 'data';

export interface ParsedForgetArgs {
  scope: ForgetScope;
  target?: string;
  includeHistory: boolean;
  wipeAll: boolean;
  presetName?: string;
}

const SCOPES = new Set<ForgetScope>(['cookies', 'cache', 'storage', 'data']);

export async function resolveForgetPreset(name: string): Promise<ParsedForgetArgs | null> {
  const config = await loadConfig();
  const preset: ForgetPreset | undefined = config.forgetPresets?.[name];
  if (!preset) return null;
  const scope = preset.scope ?? 'data';
  return {
    scope,
    includeHistory: preset.includeHistory ?? false,
    wipeAll: scope === 'all',
  };
}

export function parseForgetArgs(args: string[]): ParsedForgetArgs {
  const parts = filterFlags(args).filter((a) => !a.startsWith('--'));
  const includeHistory = hasFlag(args, '--history');
  const wipeAll = hasFlag(args, '--all');

  if (wipeAll) {
    return { scope: 'all', includeHistory: true, wipeAll: true };
  }

  if (parts[0] === 'preset') {
    return {
      scope: 'data',
      target: parts.slice(2).join(' ').trim() || undefined,
      includeHistory,
      wipeAll: false,
      presetName: parts[1],
    };
  }

  const head = parts[0]?.toLowerCase();
  if (head && SCOPES.has(head as ForgetScope)) {
    return { scope: head as ForgetScope, target: parts.slice(1).join(' ').trim() || undefined, includeHistory, wipeAll: false };
  }

  return {
    scope: 'data',
    target: parts.join(' ').trim() || undefined,
    includeHistory,
    wipeAll: false,
  };
}

/** Only types Chrome allows with the `origins` filter — others cause the API call to fail. */
export function originDataTypesForScope(scope: ForgetScope): BrowsingDataTypes {
  if (scope === 'cookies') return { cookies: true };
  if (scope === 'cache') return { cache: true, cacheStorage: true, serviceWorkers: true };
  if (scope === 'storage') {
    return { localStorage: true, indexedDB: true, cacheStorage: true, serviceWorkers: true };
  }
  return {
    cookies: true,
    cache: true,
    cacheStorage: true,
    localStorage: true,
    indexedDB: true,
    serviceWorkers: true,
  };
}

export async function resolveForgetOrigin(ctx: ExecutionContext, target?: string): Promise<string | undefined> {
  if (target) return originFromHost(target) ?? originFromUrl(target);
  const resolved = await resolvePageTab([], ctx);
  if (!resolved.ref) return undefined;
  const tab = await ctx.chrome.tabs.get(resolved.ref.id);
  return tab?.url ? originFromUrl(tab.url) : undefined;
}

export async function clearPageStorageNow(ctx: ExecutionContext, tabId: number): Promise<boolean> {
  const result = await runPageScript(tabId, ctx, 'clearPageStorage');
  if (isScriptError(result)) return false;
  return (result as { cleared: boolean }).cleared;
}

export async function forgetOrigin(chrome: ChromeAPI, origin: string, scope: ForgetScope): Promise<void> {
  const dataTypes = originDataTypesForScope(scope);
  if (!Object.values(dataTypes).some(Boolean)) return;
  await chrome.browsingData.remove({ origins: [origin], since: 0 }, dataTypes);
}

export async function forgetHistoryForOrigin(ctx: ExecutionContext, origin: string): Promise<number> {
  const domain = tabDomain(origin);
  return clearHistoryDomain(ctx, domain);
}

export async function wipeAllBrowsingData(chrome: ChromeAPI): Promise<void> {
  await chrome.browsingData.remove({ since: 0 }, {
    cache: true,
    cacheStorage: true,
    cookies: true,
    downloads: true,
    fileSystems: true,
    formData: true,
    history: true,
    indexedDB: true,
    localStorage: true,
    passwords: true,
    serviceWorkers: true,
  });
}

export async function previewForget(
  ctx: ExecutionContext,
  parsed: ParsedForgetArgs
): Promise<{ summary: string; confirmCmd: string } | { error: string }> {
  if (parsed.wipeAll) {
    return { summary: 'ALL browsing data for every site (cookies, cache, storage, history, …)', confirmCmd: 'forget --all -f' };
  }

  const origin = await resolveForgetOrigin(ctx, parsed.target);
  if (!origin) {
    return { error: parsed.target ? `Invalid site: ${parsed.target}` : 'No active page to forget. Open an http(s) tab.' };
  }

  const domain = tabDomain(origin);
  const types = Object.entries(originDataTypesForScope(parsed.scope))
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ');

  const cmd = ['forget'];
  if (parsed.scope !== 'data') cmd.push(parsed.scope);
  if (parsed.target) cmd.push(parsed.target);
  cmd.push('-f');
  if (parsed.includeHistory) cmd.push('--history');

  let summary = `${parsed.scope === 'data' ? 'site data' : parsed.scope} for ${domain} (${types})`;
  if (parsed.includeHistory) summary += ' + history';
  if (parsed.scope === 'storage' || parsed.scope === 'data') summary += ' + live page storage';

  return { summary, confirmCmd: cmd.join(' ') };
}

export async function forgetTarget(
  ctx: ExecutionContext,
  parsed: ParsedForgetArgs
): Promise<{ label: string; historyRemoved?: number; pageCleared?: boolean } | { error: string }> {
  if (parsed.wipeAll) {
    await wipeAllBrowsingData(ctx.chrome);
    await ctx.chrome.history.deleteRange({ startTime: 0, endTime: Date.now() });
    return { label: 'all browsing data' };
  }

  const origin = await resolveForgetOrigin(ctx, parsed.target);
  if (!origin) {
    return { error: parsed.target ? `Invalid site: ${parsed.target}` : 'No active page to forget. Open an http(s) tab.' };
  }

  const domain = tabDomain(origin);
  let pageCleared = false;

  if (parsed.scope === 'storage' || parsed.scope === 'data') {
    const resolved = await resolvePageTab([], ctx);
    if (resolved.ref && (!parsed.target || tabDomain((await ctx.chrome.tabs.get(resolved.ref.id))?.url ?? '') === domain)) {
      pageCleared = await clearPageStorageNow(ctx, resolved.ref.id);
    }
  }

  await forgetOrigin(ctx.chrome, origin, parsed.scope);

  let historyRemoved: number | undefined;
  if (parsed.includeHistory) {
    historyRemoved = await clearHistoryDomain(ctx, domain);
  }

  const scopeLabel =
    parsed.scope === 'data'
      ? 'site data'
      : parsed.scope === 'cookies'
        ? 'cookies'
        : parsed.scope === 'cache'
          ? 'cache'
          : 'storage';

  return { label: `${scopeLabel} for ${domain}`, historyRemoved, pageCleared };
}