/**
 * Parser for ~/.browsershellrc — single source for binds, bangs, workspaces, aliases, and settings.
 */

export interface RcBind {
  keys: string;
  action: string;
  scope: 'terminal' | 'global' | 'editor';
}

export interface RcBang {
  name: string;
  url: string;
  description?: string;
}

export interface RcWorkspaceWindow {
  layout?: string;
  tabs: string[];
}

export interface RcWorkspace {
  name: string;
  windows: RcWorkspaceWindow[];
  rules?: string[];
}

export interface ParsedRc {
  binds: RcBind[];
  aliases: Record<string, string>;
  bangs: RcBang[];
  workspaces: RcWorkspace[];
  settings: Record<string, string>;
}

const SETTING_KEYS = new Set([
  'prompt',
  'theme',
  'mouse',
  'leader',
  'global-hotkeys',
  'global-hotkeys-exceptions',
  'insert-mode-auto',
  'editor-mode',
  'editor-syntax-highlighting',
  'editor-line-numbers',
  'hint-chars',
  'hint-max',
  'scroll-step',
]);

function stripQuotes(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseAliasLine(line: string): { name: string; value: string } | null {
  const match = line.match(/^alias\s+([^\s=]+)\s*=\s*(.+)$/);
  if (!match) return null;
  return { name: match[1]!, value: stripQuotes(match[2]!) };
}

function parseSettingLine(line: string): { key: string; value: string } | null {
  const match = line.match(/^([a-z][a-z0-9-]*)\s*=\s*(.+)$/i);
  if (!match) return null;
  const key = match[1]!.toLowerCase();
  if (!SETTING_KEYS.has(key)) return null;
  return { key, value: stripQuotes(match[2]!) };
}

function parseBangLine(line: string): RcBang | null {
  const match = line.match(/^bang\s+([a-z0-9_-]+)\s+(\S+)(?:\s+#\s*(.+))?$/i);
  if (!match) return null;
  return { name: match[1]!.toLowerCase(), url: match[2]!, description: match[3]?.trim() };
}

function parseBindLine(line: string, scope: RcBind['scope']): RcBind | null {
  const rest = line.replace(/^(bind|edit-bind)\s+/, '').trim();
  if (!rest) return null;
  const tokens = tokenizeBind(rest);
  if (tokens.length < 2) return null;
  const action = tokens.slice(-1)[0]!;
  const keys = tokens.slice(0, -1).join(' ');
  return { keys, action, scope };
}

/** Split bind line respecting quoted key sequences like "<c-s>". */
function tokenizeBind(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quote = '';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (!inQuote && (ch === '"' || ch === "'")) {
      inQuote = true;
      quote = ch;
      current += ch;
      continue;
    }
    if (inQuote && ch === quote) {
      inQuote = false;
      current += ch;
      continue;
    }
    if (!inQuote && /\s/.test(ch)) {
      if (current) tokens.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

function parseWorkspaceBlock(lines: string[], start: number): { workspace: RcWorkspace; end: number } | null {
  const header = lines[start]!.trim();
  const match = header.match(/^workspace\s+([a-z0-9_-]+)\s*:\s*$/i);
  if (!match) return null;

  const workspace: RcWorkspace = { name: match[1]!.toLowerCase(), windows: [], rules: [] };
  let i = start + 1;
  let currentWindow: RcWorkspaceWindow | null = null;

  while (i < lines.length) {
    const raw = lines[i]!;
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      i++;
      continue;
    }
    if (/^(bind|edit-bind|bang|alias|workspace|prompt|theme|leader|source)\b/i.test(line)) break;

    const winMatch = line.match(/^-\s*(.+?)\s*:\s*$/);
    if (winMatch) {
      currentWindow = { layout: winMatch[1]!.trim(), tabs: [] };
      workspace.windows.push(currentWindow);
      i++;
      continue;
    }

    const tabsMatch = line.match(/^tabs:\s*\[(.+)\]\s*$/i);
    if (tabsMatch && currentWindow) {
      currentWindow.tabs = tabsMatch[1]!
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      i++;
      continue;
    }

    const ruleMatch = line.match(/^-\s*when\s+(.+)$/i);
    if (ruleMatch) {
      workspace.rules!.push(ruleMatch[1]!.trim());
      i++;
      continue;
    }

    i++;
  }

  return { workspace, end: i };
}

export function parseRc(content: string): ParsedRc {
  const result: ParsedRc = {
    binds: [],
    aliases: {},
    bangs: [],
    workspaces: [],
    settings: {},
  };

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('bind ')) {
      const bind = parseBindLine(line, line.includes('edit-bind') ? 'editor' : 'terminal');
      if (bind) {
        bind.scope = 'terminal';
        if (line.startsWith('bind ')) {
          const globalActions = /^(hints-|scroll-|history-|focus-|visual-|yank-|paste-|tab-|reload|seek|seek-next|seek-prev|edit|ai-|split|save-selection|help-overlay|insert-mode|view-source|url-|edit-url|frame-|pagination-|open-url|bookmark-|open-multiple-links|window-|mark-jump)/;
          if (globalActions.test(bind.action)) bind.scope = 'global';
        }
        result.binds.push(bind);
      }
      continue;
    }

    if (line.startsWith('edit-bind ')) {
      const bind = parseBindLine(line, 'editor');
      if (bind) result.binds.push(bind);
      continue;
    }

    const alias = parseAliasLine(line);
    if (alias) {
      result.aliases[alias.name] = alias.value;
      continue;
    }

    const bang = parseBangLine(line);
    if (bang) {
      result.bangs.push(bang);
      continue;
    }

    const setting = parseSettingLine(line);
    if (setting) {
      result.settings[setting.key] = setting.value;
      continue;
    }

    if (/^workspace\s+/i.test(line)) {
      const parsed = parseWorkspaceBlock(lines, i);
      if (parsed) {
        result.workspaces.push(parsed.workspace);
        i = parsed.end - 1;
      }
      continue;
    }
  }

  return result;
}