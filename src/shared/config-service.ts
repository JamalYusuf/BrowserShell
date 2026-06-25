/**
 * Central configuration service — parses ~/.browsershellrc and merges with chrome.storage.
 */

import { DEFAULT_RC } from './default-rc';
import { DEFAULT_SHELL_CONFIG, loadConfig, saveConfig } from './storage';
import type { ShellConfig } from './types';
import { parseRc, type ParsedRc, type RcBang } from './rc-parser';
import { resolveBindings, type ResolvedBinding } from './keybindings';
import { resolveSequenceBindings, type SequenceBinding } from './key-sequence';
import { mergeBangs } from './bangs';

export interface RuntimeConfig {
  shell: ShellConfig;
  parsed: ParsedRc;
  bindings: ResolvedBinding[];
  sequences: SequenceBinding[];
  bangs: Record<string, { url: string; description?: string }>;
}

let cached: RuntimeConfig | null = null;

function bindKey(bind: { keys: string; scope: string }): string {
  return `${bind.scope}:${bind.keys}`;
}

/** Merge shipped global binds when user rc omits them (e.g. rcVersion bumped without content). */
function supplementGlobalBinds(parsed: ParsedRc): ParsedRc {
  const defaults = parseRc(DEFAULT_RC);
  const seen = new Set(parsed.binds.map(bindKey));
  const extra = defaults.binds.filter((b) => b.scope === 'global' && !seen.has(bindKey(b)));
  if (!extra.length) return parsed;
  return { ...parsed, binds: [...parsed.binds, ...extra] };
}

function assembleRuntimeConfig(shell: ShellConfig): RuntimeConfig {
  const parsed = supplementGlobalBinds(parseRc(shell.rc));
  const leader = shell.leader ?? parsed.settings.leader;
  const shellWithRc = applyRcSettings(shell, parsed);
  const bangs = bangsFromParsed(parsed, shell.bangs ?? {});
  const binds = parsed.binds;
  return {
    shell: { ...shellWithRc, bangs, workspaces: shell.workspaces ?? {} },
    parsed: { ...parsed, binds },
    bindings: resolveBindings(binds, leader),
    sequences: resolveSequenceBindings(binds, leader),
    bangs,
  };
}

/** Synchronous fallback so content-script hotkeys work before async storage loads. */
export function bootstrapRuntimeConfig(): RuntimeConfig {
  if (!cached) cached = assembleRuntimeConfig(DEFAULT_SHELL_CONFIG);
  return cached;
}

function bangsFromParsed(parsed: ParsedRc, stored: Record<string, { url: string; description?: string }> = {}): Record<string, { url: string; description?: string }> {
  const merged = { ...stored };
  for (const b of parsed.bangs) {
    merged[b.name] = { url: b.url, description: b.description };
  }
  return merged;
}

function applyRcSettings(shell: ShellConfig, parsed: ParsedRc): ShellConfig {
  const next = { ...shell, aliases: { ...shell.aliases, ...parsed.aliases } };
  if (parsed.settings.prompt) next.prompt = parsed.settings.prompt;
  if (parsed.settings.theme) next.theme = parsed.settings.theme;
  if (parsed.settings.leader) next.leader = parsed.settings.leader;
  if (parsed.settings['global-hotkeys'] !== undefined) {
    next.globalHotkeys = parsed.settings['global-hotkeys'] !== 'false';
  } else if (shell.globalHotkeys !== undefined) {
    next.globalHotkeys = shell.globalHotkeys;
  } else {
    next.globalHotkeys = true;
  }
  if (parsed.settings['insert-mode-auto'] !== undefined) {
    next.insertModeAuto = parsed.settings['insert-mode-auto'] !== 'false';
  }
  if (parsed.settings['editor-mode']) next.editorMode = parsed.settings['editor-mode'];
  return next;
}

export async function loadRuntimeConfig(force = false): Promise<RuntimeConfig> {
  if (cached && !force) return cached;

  const shell = await loadConfig();
  cached = assembleRuntimeConfig(shell);
  return cached;
}

/** Synchronous read of last-loaded runtime config (for content-script hotkeys). */
export function getCachedRuntimeConfig(): RuntimeConfig | null {
  return cached;
}

export function invalidateConfigCache(): void {
  cached = null;
}

export async function preloadRuntimeConfig(): Promise<RuntimeConfig> {
  return loadRuntimeConfig(true);
}

export async function reloadConfig(): Promise<RuntimeConfig> {
  invalidateConfigCache();
  return loadRuntimeConfig(true);
}

export async function persistBang(bang: RcBang): Promise<void> {
  const cfg = await loadConfig();
  const bangs = { ...(cfg.bangs ?? {}), [bang.name]: { url: bang.url, description: bang.description } };
  await saveConfig({ bangs });
  invalidateConfigCache();
}

export async function removeBang(name: string): Promise<void> {
  const cfg = await loadConfig();
  const bangs = { ...(cfg.bangs ?? {}) };
  delete bangs[name];
  await saveConfig({ bangs });
  invalidateConfigCache();
}

export function listAllBangs(custom: Record<string, { url: string; description?: string }> = {}) {
  return mergeBangs(custom);
}