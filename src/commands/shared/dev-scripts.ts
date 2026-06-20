/** Injected into page context via page/inject.js — no cross-file imports. */

function countElements(selector: string): number {
  return document.querySelectorAll(selector).length;
}

export interface PageAudit {
  url: string;
  readyState: string;
  domNodes: number;
  scripts: number;
  stylesheets: number;
  images: number;
  links: number;
  forms: number;
  iframes: number;
  localStorageKeys: number;
  sessionStorageKeys: number;
  cookies: number;
  loadMs: number | null;
  domContentLoadedMs: number | null;
  transferKb: number | null;
  jsHeapMb: number | null;
}

export function getPageAudit(): PageAudit {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  const domNodes = document.querySelectorAll('*').length;

  return {
    url: location.href,
    readyState: document.readyState,
    domNodes,
    scripts: countElements('script'),
    stylesheets: countElements('link[rel="stylesheet"], style'),
    images: countElements('img'),
    links: countElements('a[href]'),
    forms: countElements('form'),
    iframes: countElements('iframe'),
    localStorageKeys: localStorage.length,
    sessionStorageKeys: sessionStorage.length,
    cookies: document.cookie ? document.cookie.split(';').filter((c) => c.trim()).length : 0,
    loadMs: nav ? Math.round(nav.loadEventEnd) : null,
    domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    transferKb: nav?.transferSize ? Math.round(nav.transferSize / 1024) : null,
    jsHeapMb: mem?.usedJSHeapSize ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null,
  };
}

export interface TechSignal {
  name: string;
  detail: string;
}

export function detectTech(): TechSignal[] {
  const found: TechSignal[] = [];
  const add = (name: string, detail: string) => {
    if (!found.some((f) => f.name === name)) found.push({ name, detail });
  };

  const gen = document.querySelector('meta[name="generator"]')?.getAttribute('content');
  if (gen) add('Generator', gen);

  const win = window as unknown as Record<string, unknown>;
  if (win.__NEXT_DATA__) add('Next.js', 'window.__NEXT_DATA__');
  if (document.querySelector('#__next')) add('Next.js', '#__next root');
  if (win.__NUXT__) add('Nuxt', 'window.__NUXT__');
  if (document.querySelector('[data-reactroot], [data-reactid]') || win.React) add('React', 'React root / window.React');
  if (document.querySelector('[data-v-app]') || win.__VUE__) add('Vue', 'Vue app marker');
  if (document.documentElement.getAttribute('ng-version')) {
    add('Angular', `v${document.documentElement.getAttribute('ng-version')}`);
  }
  if (win.jQuery || win.$) add('jQuery', 'window.jQuery');
  if (document.querySelector('script[src*="wp-content"], link[href*="wp-content"]')) add('WordPress', 'wp-content assets');
  if (document.querySelector('script[src*="cdn.shopify.com"], link[href*="cdn.shopify.com"]')) add('Shopify', 'Shopify CDN');
  if (document.querySelector('script[src*="gatsby"], #___gatsby')) add('Gatsby', 'Gatsby markers');
  if (document.querySelector('script[src*="stripe.com"]')) add('Stripe', 'stripe.com script');
  if (document.querySelector('script[src*="googletagmanager"], script[src*="google-analytics"]')) add('Analytics', 'Google tag');
  if (document.querySelector('script[src*="clarity.ms"]')) add('Clarity', 'Microsoft Clarity');
  if (document.querySelector('script[src*="hotjar"]')) add('Hotjar', 'Hotjar script');
  if (document.querySelector('script[src*="sentry"]') || win.Sentry) add('Sentry', 'error monitoring');

  return found;
}

export interface StorageEntry {
  key: string;
  bytes: number;
  preview: string;
}

function storageArea(area: string): Storage | null {
  if (area === 'session') return sessionStorage;
  if (area === 'local' || !area) return localStorage;
  return null;
}

export function listStorage(area: string, pattern: string, limit: number): StorageEntry[] {
  const store = storageArea(area);
  if (!store) return [];
  const regex = pattern ? new RegExp(pattern, 'i') : null;
  const results: StorageEntry[] = [];

  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key) continue;
    if (regex && !regex.test(key)) continue;
    const value = store.getItem(key) ?? '';
    results.push({
      key,
      bytes: new Blob([value]).size,
      preview: value.replace(/\s+/g, ' ').slice(0, 80),
    });
    if (results.length >= limit) break;
  }

  return results.sort((a, b) => a.key.localeCompare(b.key));
}

export function getStorageItem(area: string, key: string): { key: string; value: string } | null {
  const store = storageArea(area);
  if (!store || !key) return null;
  const value = store.getItem(key);
  if (value === null) return null;
  return { key, value };
}

export interface ResourceEntry {
  name: string;
  type: string;
  duration: number;
  size: number;
  status: number;
}

export function getPageRequests(pattern: string, limit: number, slowMs: number): ResourceEntry[] {
  const regex = pattern ? new RegExp(pattern, 'i') : null;
  const entries = performance
    .getEntriesByType('resource')
    .map((e) => {
      const r = e as PerformanceResourceTiming;
      return {
        name: r.name.split('?')[0]!.slice(-80),
        type: r.initiatorType || 'other',
        duration: Math.round(r.duration),
        size: r.transferSize || 0,
        status: (r as PerformanceResourceTiming & { responseStatus?: number }).responseStatus || 0,
      };
    })
    .filter((r) => {
      if (slowMs > 0 && r.duration < slowMs) return false;
      if (!regex) return true;
      return regex.test(r.name) || regex.test(r.type);
    })
    .sort((a, b) => b.duration - a.duration);

  return entries.slice(0, limit);
}

export interface ViewportInfo {
  innerWidth: number;
  innerHeight: number;
  scrollX: number;
  scrollY: number;
  pageWidth: number;
  pageHeight: number;
  devicePixelRatio: number;
  scrollPercent: number;
}

export function getViewportInfo(): ViewportInfo {
  const pageHeight = document.documentElement.scrollHeight;
  const maxScroll = Math.max(0, pageHeight - window.innerHeight);
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollX: Math.round(window.scrollX),
    scrollY: Math.round(window.scrollY),
    pageWidth: document.documentElement.scrollWidth,
    pageHeight,
    devicePixelRatio: window.devicePixelRatio,
    scrollPercent: maxScroll > 0 ? Math.round((window.scrollY / maxScroll) * 100) : 0,
  };
}

export interface FrameInfo {
  index: number;
  src: string;
  id: string;
  name: string;
  sandbox: string;
  crossOrigin: boolean;
}

export function listFrames(limit: number): FrameInfo[] {
  const frames = [...document.querySelectorAll('iframe')];
  return frames.slice(0, limit).map((el, i) => {
    const iframe = el as HTMLIFrameElement;
    let crossOrigin = true;
    try {
      crossOrigin = !iframe.contentDocument;
    } catch {
      crossOrigin = true;
    }
    return {
      index: i + 1,
      src: iframe.src || iframe.getAttribute('srcdoc') ? '(srcdoc)' : '(empty)',
      id: iframe.id || '',
      name: iframe.name || '',
      sandbox: iframe.sandbox?.toString() || '',
      crossOrigin,
    };
  });
}

export interface CookieInfo {
  name: string;
  value: string;
}

export function listCookies(): CookieInfo[] {
  if (!document.cookie.trim()) return [];
  return document.cookie.split(';').map((part) => {
    const [name, ...rest] = part.trim().split('=');
    return { name: name?.trim() || '', value: rest.join('=').trim() };
  });
}

export function clearPageStorage(): { cleared: boolean; localKeys: number; sessionKeys: number } {
  const localKeys = localStorage.length;
  const sessionKeys = sessionStorage.length;
  localStorage.clear();
  sessionStorage.clear();
  if (document.cookie) {
    const host = location.hostname;
    for (const part of document.cookie.split(';')) {
      const name = part.split('=')[0]?.trim();
      if (!name) continue;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${host}`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${host}`;
    }
  }
  return { cleared: true, localKeys, sessionKeys };
}

export function getJsonLd(limit: number): { index: number; type: string; raw: string }[] {
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  return scripts.slice(0, limit).map((el, i) => {
    const raw = el.textContent?.trim() ?? '';
    let type = 'Unknown';
    try {
      const parsed = JSON.parse(raw) as { '@type'?: string | string[] };
      const t = parsed['@type'];
      type = Array.isArray(t) ? t.join(', ') : t || 'Unknown';
    } catch {
      type = 'Invalid JSON';
    }
    return { index: i + 1, type, raw: raw.slice(0, 500) };
  });
}