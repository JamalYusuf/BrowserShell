/** Service worker — Quake-style overlay toggle. */

import { DEFAULT_CONFIG, loadConfig } from '@/shared/storage';
import { fetchWeatherLine } from '@/shared/weather';

function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:')
  );
}

async function toggleOverlay(tabId?: number): Promise<void> {
  const config = await loadConfig();
  if (!config.overlayEnabled) return;

  const id =
    tabId ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;

  if (!id) return;

  const tab = await chrome.tabs.get(id);
  if (isRestrictedUrl(tab.url)) return;

  try {
    await chrome.tabs.sendMessage(id, { type: 'toggle-overlay' });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: id },
        files: ['content/overlay.js'],
      });
      await chrome.tabs.sendMessage(id, { type: 'toggle-overlay' });
    } catch {
      // Overlay unavailable on this page
    }
  }
}

chrome.action.onClicked.addListener((tab) => {
  toggleOverlay(tab.id).catch(() => {});
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-panel' || command === 'toggle-overlay') {
    toggleOverlay().catch(() => {});
  }
});

function downloadsAction(action: 'open' | 'show', id: number): { ok: boolean; error?: string } {
  if (action === 'open') {
    chrome.downloads.open(id);
  } else {
    chrome.downloads.show(id);
  }
  const err = chrome.runtime.lastError;
  if (err) return { ok: false, error: err.message };
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'get-host-tab-id') {
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }
  if (msg.type === 'welcome-weather') {
    fetchWeatherLine()
      .then((weather) => sendResponse({ weather }))
      .catch(() => sendResponse({ weather: null }));
    return true;
  }
  if (msg.type === 'downloads-action' && typeof msg.id === 'number') {
    const action = msg.action === 'show' ? 'show' : 'open';
    sendResponse(downloadsAction(action, msg.id));
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      config: { ...DEFAULT_CONFIG, firstRunComplete: false },
    });
  }
});