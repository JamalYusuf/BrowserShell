import type { ChromeAPI } from '@/chrome/api';
import type { ExecutionContext } from '@/shared/types';
import type { VirtualFileSystem } from '@/vfs';
import { basename, dirname, normalizePath } from '@/vfs/path';
import { getActiveWindowId, getWindowTabs } from '@/commands/shared/tab-utils';
import { fuzzyFilter } from './fuzzy';
import { getRegistry } from './registry';

export interface CompletionContext {
  input: string;
  vfs: VirtualFileSystem;
  chrome: ChromeAPI;
  env: Record<string, string>;
  cwd: string;
  aliases: Record<string, string>;
}

const SUBCOMMANDS: Record<string, string[]> = {
  tab: ['new', 'close', 'switch', 'next', 'prev', 'pin', 'unpin', 'duplicate'],
  bookmark: ['add', 'search', 'open'],
  history: ['delete', 'clear', 'search', 'recent', 'today', 'yesterday', 'this-week'],
  forget: ['preset', 'cookies', 'cache', 'storage', '--history', '--all', '--dry-run'],
  siteinfo: ['--json', '--compare'],
  downloads: ['open', 'show', 'delete', 'clear'],
  extensions: ['enable', 'disable', 'options'],
  session: ['save', 'restore', 'delete'],
  cookies: ['clear'],
  storage: ['clear', 'get', 'local', 'session'],
  ai: ['summarize', 'explain'],
  config: ['list', 'get', 'set'],
  zoom: ['in', 'out', 'reset'],
  scroll: ['top', 'bottom', 'up', 'down'],
  volume: ['status', 'mute', 'unmute'],
  mute: ['on', 'off', 'toggle'],
  seek: ['--next', '--prev', '--grep'],
  qf: ['--all'],
  tabs: ['--all', '--json'],
  clip: ['url', 'title', 'md', 'both', 'selection', 'log'],
  export: ['log'],
  reload: ['--hard'],
  link: ['open', 'new', 'click', 'copy', 'show', 'find'],
  links: [],
  click: [],
  input: ['focus', 'fill', 'clear', 'show'],
  inputs: [],
  image: ['open', 'copy', 'show'],
  images: [],
  press: [],
  meta: ['--json'],
  search: ['--tabs', '--bookmarks', '--history', '--downloads'],
  log: ['clear'],
  notify: [],
  overlay: ['half', 'full', 'show', 'hide', 'toggle', 'status', 'height'],
  recent: ['restore'],
  permissions: ['set', 'reset'],
  perf: ['--json'],
  watch: ['stop', 'status'],
};

const PATH_COMMANDS = new Set(['ls', 'cd', 'cat', 'open', 'close', 'source', 'grep', 'touch', 'edit', 'rm']);

const TAB_ARG_SUBS = new Set(['switch', 'close', 'pin', 'unpin', 'duplicate']);

export function longestCommonPrefix(strings: string[]): string {
  if (!strings.length) return '';
  let prefix = strings[0]!;
  for (const s of strings.slice(1)) {
    while (!s.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}

/** Parse the active pipeline segment and token being completed. */
export function parseCompletionInput(input: string): {
  segment: string;
  words: string[];
  currentWord: string;
  wordIndex: number;
  commandName: string;
  completingCommand: boolean;
} {
  const segment = input.split('|').pop() ?? input;
  const trimmed = segment.replace(/^\s+/, '');
  const leadingSpaces = segment.length - trimmed.length;

  const words: string[] = [];
  let current = '';
  let inQuote: '"' | "'" | null = null;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]!;
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        words.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  const endsWithSpace = /\s$/.test(trimmed);
  if (current) words.push(current);

  const wordIndex = endsWithSpace ? words.length : Math.max(0, words.length - 1);
  const currentWord = endsWithSpace ? '' : words[wordIndex] ?? '';
  const commandName = words[0] ?? '';
  const completingCommand = wordIndex === 0;

  return {
    segment: ' '.repeat(leadingSpaces) + trimmed,
    words,
    currentWord,
    wordIndex,
    commandName,
    completingCommand,
  };
}

export async function completeVfsPath(
  partial: string,
  cwd: string,
  vfs: VirtualFileSystem
): Promise<string[]> {
  const raw = partial || '';
  const isAbs = raw.startsWith('/');
  const full = isAbs ? raw : raw ? normalizePath(raw, cwd) : cwd;
  const endsWithSlash = full.endsWith('/');
  const dir = endsWithSlash ? normalizePath(full) : dirname(normalizePath(full));
  const prefix = endsWithSlash ? '' : basename(full);

  try {
    const entries = await vfs.readdir(dir);
    return entries
      .filter((e) => !prefix || e.name.startsWith(prefix))
      .map((e) => {
        const name = e.type === 'directory' ? `${e.name}/` : e.name;
        if (isAbs || dir !== cwd) {
          const base = endsWithSlash ? dir : dir === '/' ? '' : dir;
          return `${base}/${name}`.replace(/\/+/g, '/');
        }
        return name;
      });
  } catch {
    return [];
  }
}

export async function getShellCompletions(ctx: CompletionContext): Promise<string[]> {
  const { words, currentWord, wordIndex, commandName, completingCommand } = parseCompletionInput(ctx.input);
  const registry = getRegistry();

  if (completingCommand) {
    const prefix = currentWord.toLowerCase();
    const names = registry.getNames();
    const aliasNames = Object.keys(ctx.aliases);
    const all = [...new Set([...names, ...aliasNames])];
    const exact = all.filter((n) => n.toLowerCase().startsWith(prefix));
    if (exact.length) return exact.sort();
    if (!prefix) return all.sort();
    return fuzzyFilter(all, prefix, (n) => n).slice(0, 20);
  }

  const resolved = ctx.aliases[commandName]?.split(/\s+/)[0] ?? commandName;
  const cmd = registry.resolve(resolved);
  const sub = words[1];

  if (SUBCOMMANDS[resolved]) {
    if (wordIndex === 1) {
      return SUBCOMMANDS[resolved].filter((s) => s.startsWith(currentWord));
    }
    if (resolved === 'tab' && sub && TAB_ARG_SUBS.has(sub) && wordIndex === 2) {
      const tabs = await ctx.chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const winId = tabs[0]?.windowId ?? (await getActiveWindowId({
        chrome: ctx.chrome,
        getActiveWindowId: async () => 0,
      } as ExecutionContext));
      const windowTabs = await getWindowTabs(ctx.chrome, winId);
      return windowTabs.map((_, i) => String(i + 1)).filter((n) => n.startsWith(currentWord));
    }
  }

  if (PATH_COMMANDS.has(resolved)) {
    if (wordIndex === 1 || (resolved === 'grep' && wordIndex === 2 && words.length > 2)) {
      const partial = currentWord;
      if (partial.startsWith('-')) return [];
      return completeVfsPath(partial, ctx.cwd, ctx.vfs);
    }
  }

  if (cmd?.getCompletions) {
    const execCtx: ExecutionContext = {
      vfs: ctx.vfs,
      chrome: ctx.chrome,
      env: ctx.env,
      cwd: ctx.cwd,
      aliases: ctx.aliases,
      stdin: '',
      piped: false,
      cols: 80,
      writeStdout: () => {},
      writeStderr: () => {},
      setCwd: () => {},
      setEnv: () => {},
      setAlias: () => {},
    };
    const argPartial = currentWord;
    const synthetic = [...words.slice(0, wordIndex), argPartial].join(' ');
    return cmd.getCompletions(synthetic, execCtx);
  }

  return [];
}

export function applyCompletion(input: string, match: string): string {
  const pipePrefix = input.includes('|') ? input.split('|').slice(0, -1).join('|') + '|' : '';
  const { segment, words, wordIndex, completingCommand } = parseCompletionInput(input);
  const leading = segment.match(/^\s*/)?.[0] ?? '';
  const trimmed = segment.slice(leading.length);
  const endsWithSpace = /\s$/.test(trimmed);

  const nextWords = [...words];
  if (endsWithSpace || nextWords.length === 0) {
    nextWords.push(match);
  } else {
    nextWords[wordIndex] = match;
  }

  const completed = nextWords.join(' ');
  const addTrailingSpace =
    (completingCommand && nextWords.length === 1) || (match.endsWith('/') && !endsWithSpace);
  const suffix = addTrailingSpace && !match.endsWith('/') ? ' ' : '';
  return pipePrefix + leading + completed + suffix;
}