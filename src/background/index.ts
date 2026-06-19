/** Service worker — overlay toggle (primary) and optional side panel. */

import { DEFAULT_CONFIG, loadConfig } from '@/shared/storage';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:')
  );
}

async function openSidePanel(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
}

async function toggleOverlay(tabId?: number): Promise<void> {
  const config = await loadConfig();

  if (!config.overlayEnabled || config.displayMode === 'sidepanel') {
    await openSidePanel();
    return;
  }

  const id =
    tabId ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;

  if (!id) return;

  const tab = await chrome.tabs.get(id);
  if (isRestrictedUrl(tab.url)) {
    await openSidePanel();
    return;
  }

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
      await openSidePanel();
    }
  }
}

chrome.action.onClicked.addListener((tab) => {
  toggleOverlay(tab.id).catch(() => openSidePanel());
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-panel' || command === 'toggle-overlay') {
    toggleOverlay().catch(() => openSidePanel());
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      config: { ...DEFAULT_CONFIG, firstRunComplete: false },
    });
  }
});