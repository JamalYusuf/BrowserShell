/**
 * Bundled page-script injector — loaded into the tab via chrome.scripting.executeScript({ files }).
 * All helpers stay in this bundle; dispatch by name from the overlay.
 */
import {
  clearInputAtIndex,
  clickLinkAtIndex,
  clickTarget,
  extractReadableText,
  fillElement,
  fillInputAtIndex,
  focusInputAtIndex,
  getPageMeta,
  getSelectionText,
  grepPageText,
  listPageImages,
  listPageInputs,
  listPageLinks,
  pressKey,
  scrollPage,
  seekInPage,
  setPageTitle,
  setPageVolume,
} from '@/commands/shared/page-scripts';
import {
  clearPageStorage,
  detectTech,
  getJsonLd,
  getPageAudit,
  getPageRequests,
  getStorageItem,
  getViewportInfo,
  listCookies,
  listFrames,
  listStorage,
} from '@/commands/shared/dev-scripts';

const registry: Record<string, (...args: unknown[]) => unknown> = {
  seekInPage: (...args) => seekInPage(...(args as [string, boolean])),
  scrollPage: (...args) => scrollPage(...(args as [string, number])),
  setPageVolume: (...args) => setPageVolume(...(args as [string, number])),
  grepPageText: (...args) => grepPageText(...(args as [string, number])),
  listPageLinks: (...args) => listPageLinks(...(args as [string, number])),
  clickTarget: (...args) => clickTarget(...(args as [string])),
  clickLinkAtIndex: (...args) => clickLinkAtIndex(...(args as [number, string])),
  setPageTitle: (...args) => setPageTitle(...(args as [string])),
  fillElement: (...args) => fillElement(...(args as [string, string])),
  getSelectionText: () => getSelectionText(),
  extractReadableText: (...args) => extractReadableText(...(args as [number])),
  listPageInputs: (...args) => listPageInputs(...(args as [string, number])),
  focusInputAtIndex: (...args) => focusInputAtIndex(...(args as [number, string])),
  fillInputAtIndex: (...args) => fillInputAtIndex(...(args as [number, string, string])),
  clearInputAtIndex: (...args) => clearInputAtIndex(...(args as [number, string])),
  pressKey: (...args) => pressKey(...(args as [string])),
  getPageMeta: () => getPageMeta(),
  listPageImages: (...args) => listPageImages(...(args as [string, number])),
  getPageAudit: () => getPageAudit(),
  detectTech: () => detectTech(),
  listStorage: (...args) => listStorage(...(args as [string, string, number])),
  getStorageItem: (...args) => getStorageItem(...(args as [string, string])),
  getPageRequests: (...args) => getPageRequests(...(args as [string, number, number])),
  getViewportInfo: () => getViewportInfo(),
  listFrames: (...args) => listFrames(...(args as [number])),
  listCookies: () => listCookies(),
  getJsonLd: (...args) => getJsonLd(...(args as [number])),
  clearPageStorage: () => clearPageStorage(),
};

(globalThis as { __bsPage_dispatch?: (name: string, args: unknown[]) => unknown }).__bsPage_dispatch = (
  name: string,
  args: unknown[]
) => {
  const fn = registry[name];
  if (!fn) throw new Error(`Unknown page script: ${name}`);
  return fn(...args);
};