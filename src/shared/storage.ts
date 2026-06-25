import type { ShellConfig } from './types';
import { DEFAULT_RC, RC_VERSION } from './default-rc';

const LEGACY_RC_PREFIX = '# BrowserShell — power aliases';

export const DEFAULT_SHELL_CONFIG: ShellConfig = {
  theme: 'redline',
  username: 'user',
  welcomeEnabled: true,
  prompt: '\\u@\\h:\\w$ ',
  hotkey: 'Command+Shift+K',
  firstRunComplete: false,
  aliases: {},
  env: {
    HOME: '/',
    USER: 'user',
    SHELL: 'browsershell',
  },
  history: [],
  rc: DEFAULT_RC,
  toggleKey: '`',
  customThemes: [],
  forgetPresets: {
    light: { scope: 'cookies' },
    cache: { scope: 'cache' },
    full: { scope: 'data', includeHistory: true },
  },
  overlayEnabled: true,
  overlayHeight: 100,
  overlayOpacity: 0.88,
  backdropBlur: 6,
  backdropDim: 0.25,
  fontSize: 13,
  fontFamily: 'jetbrains',
  promptColor: '',
  cursorBlink: true,
  cursorStyle: 'block',
  lineHeight: 1.3,
  letterSpacing: 0,
  leader: '<space>',
  globalHotkeys: true,
  globalHotkeysExceptions: [],
  insertModeAuto: true,
  editorMode: 'simple',
  bangs: {},
  workspaces: {},
  keybindings: [],
  rcVersion: RC_VERSION,
};

/** Ensure shipped Vimium-style binds and global-hotkeys setting are present in rc. */
export function ensureRcDefaults(config: ShellConfig): ShellConfig {
  const rc = config.rc ?? '';
  if (rc.includes('bind f') && rc.includes('global-hotkeys') && rc.includes('hint-chars')) {
    return {
      ...config,
      globalHotkeys: config.globalHotkeys ?? true,
      rcVersion: RC_VERSION,
    };
  }
  return {
    ...config,
    rc: DEFAULT_RC,
    globalHotkeys: true,
    rcVersion: RC_VERSION,
  };
}

function needsRcMigration(stored: Partial<ShellConfig> | undefined): boolean {
  if (!stored) return false;
  const rc = stored.rc ?? '';
  return (
    rc.startsWith(LEGACY_RC_PREFIX) ||
    !rc.includes('bind f') ||
    !rc.includes('global-hotkeys') ||
    !rc.includes('hint-chars')
  );
}

export async function loadConfig(): Promise<ShellConfig> {
  const result = await chrome.storage.local.get('config');
  const stored = result.config as Partial<ShellConfig> | undefined;

  if (stored?.theme === 'dark') stored.theme = 'github-dark';
  if (stored?.theme === 'light') stored.theme = 'github-dark';

  let merged: ShellConfig = ensureRcDefaults({ ...DEFAULT_SHELL_CONFIG, ...stored });

  if (needsRcMigration(stored)) {
    merged = ensureRcDefaults(merged);
    await chrome.storage.local.set({ config: merged });
  } else if (
    stored &&
    (merged.rc !== stored.rc || merged.globalHotkeys !== stored.globalHotkeys || (stored.rcVersion ?? 0) < RC_VERSION)
  ) {
    await chrome.storage.local.set({ config: merged });
  }

  if (!merged.customThemes) merged.customThemes = [];
  if (!merged.username) merged.username = merged.env?.USER || 'user';
  if (merged.welcomeEnabled === undefined) merged.welcomeEnabled = true;
  if (merged.globalHotkeys === undefined) merged.globalHotkeys = true;
  return merged;
}

export async function saveConfig(config: Partial<ShellConfig>): Promise<void> {
  const current = await loadConfig();
  const merged = { ...current, ...config, rcVersion: RC_VERSION };
  await chrome.storage.local.set({ config: merged });
  chrome.runtime?.sendMessage?.({ type: 'config-updated', config: merged })?.catch(() => {});
}

export async function addHistoryEntry(command: string): Promise<void> {
  const config = await loadConfig();
  const history = [...config.history.filter((h) => h !== command), command].slice(-500);
  await saveConfig({ history });
}

export async function getHistory(): Promise<string[]> {
  const config = await loadConfig();
  return config.history;
}

/** @deprecated Use DEFAULT_SHELL_CONFIG */
export const DEFAULT_CONFIG = DEFAULT_SHELL_CONFIG;