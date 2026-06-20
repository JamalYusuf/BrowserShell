import type { ExecutionContext } from '@/shared/types';
import { originDataTypesForScope, resolveForgetOrigin } from './privacy-utils';
import { tabDomain } from './url';

export interface SiteAudit {
  domain: string;
  origin: string;
  cookies: number;
  historyEntries: number;
  openTabs: number;
  dataTypes: string[];
  forgetCmd: string;
}

function matchesDomain(url: string, domain: string): boolean {
  const host = tabDomain(url).replace(/^www\./, '');
  const needle = domain.replace(/^www\./, '');
  return host === needle || host.endsWith(`.${needle}`);
}

export async function auditSite(
  ctx: ExecutionContext,
  target?: string
): Promise<SiteAudit | { error: string }> {
  const origin = await resolveForgetOrigin(ctx, target);
  if (!origin) {
    return {
      error: target
        ? `Invalid site: ${target}`
        : 'No active page to inspect. Open an http(s) tab or pass a domain.',
    };
  }

  const domain = tabDomain(origin);
  const cookieList = await ctx.chrome.cookies.getAll({ domain });
  const historyItems = await ctx.chrome.history.search({ text: domain, maxResults: 5000 });
  const historyEntries = historyItems.filter((item) => matchesDomain(item.url, domain)).length;

  const tabs = await ctx.chrome.tabs.query({});
  const openTabs = tabs.filter((tab) => tab.url && matchesDomain(tab.url, domain)).length;

  const dataTypes = Object.entries(originDataTypesForScope('data'))
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  const forgetTarget = target || domain;
  const forgetCmd = `forget ${forgetTarget} --history -f`;

  return {
    domain,
    origin,
    cookies: cookieList.length,
    historyEntries,
    openTabs,
    dataTypes,
    forgetCmd,
  };
}