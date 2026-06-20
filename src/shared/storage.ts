import type { ShellConfig } from './types';

const DEFAULT_CONFIG: ShellConfig = {
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
  rc: [
    '# BrowserShell — power aliases',
    'alias g=go',
    'alias .=qf',
    'alias n=tab next',
    'alias p=tab prev',
    'alias k=tab close current',
    'alias b=bookmark add',
    'alias r=reload',
    'alias ll=ls',
    'alias lt=tabs',
  ].join('\n'),
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
};

export async function loadConfig(): Promise<ShellConfig> {
  const result = await chrome.storage.local.get('config');
  const stored = result.config as Partial<ShellConfig> | undefined;
  // Migrate legacy theme names
  if (stored?.theme === 'dark') stored.theme = 'github-dark';
  if (stored?.theme === 'light') stored.theme = 'github-dark';
  const merged = { ...DEFAULT_CONFIG, ...stored };
  if (!merged.customThemes) merged.customThemes = [];
  if (!merged.username) merged.username = merged.env?.USER || 'user';
  if (merged.welcomeEnabled === undefined) merged.welcomeEnabled = true;
  return merged;
}

export async function saveConfig(config: Partial<ShellConfig>): Promise<void> {
  const current = await loadConfig();
  const merged = { ...current, ...config };
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

export { DEFAULT_CONFIG };