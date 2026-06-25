/**
 * Hashbang / site shortcut resolution — built-in + user-defined from rc and storage.
 */

export interface BangDefinition {
  name: string;
  url: string;
  description?: string;
  builtin?: boolean;
}

export const BUILTIN_BANGS: BangDefinition[] = [
  { name: 'g', url: 'https://www.google.com/search?q=%s', description: 'Google search', builtin: true },
  { name: 'gh', url: 'https://github.com/search?q=%s', description: 'GitHub search', builtin: true },
  { name: 'yt', url: 'https://www.youtube.com/results?search_query=%s', description: 'YouTube search', builtin: true },
  { name: 'so', url: 'https://stackoverflow.com/search?q=%s', description: 'Stack Overflow', builtin: true },
  { name: 'tw', url: 'https://x.com/search?q=%s', description: 'X / Twitter search', builtin: true },
  { name: 'x', url: 'https://x.com/search?q=%s', description: 'X search (alias)', builtin: true },
  { name: 'npm', url: 'https://www.npmjs.com/search?q=%s', description: 'npm registry', builtin: true },
  { name: 'pypi', url: 'https://pypi.org/search/?q=%s', description: 'Python Package Index', builtin: true },
  { name: 'mdn', url: 'https://developer.mozilla.org/en-US/search?q=%s', description: 'MDN Web Docs', builtin: true },
  { name: 'w', url: 'https://en.wikipedia.org/wiki/Special:Search?search=%s', description: 'Wikipedia', builtin: true },
  { name: 'linear', url: 'https://linear.app/search?q=%s', description: 'Linear', builtin: true },
  { name: 'notion', url: 'https://www.notion.so/search?q=%s', description: 'Notion', builtin: true },
  { name: 'bm', url: 'bookmark:%s', description: 'Bookmark search (command)', builtin: true },
  { name: 'ddg', url: 'https://duckduckgo.com/?q=%s', description: 'DuckDuckGo', builtin: true },
  { name: 'r', url: 'https://www.reddit.com/search/?q=%s', description: 'Reddit search', builtin: true },
  { name: 'hn', url: 'https://hn.algolia.com/?q=%s', description: 'Hacker News', builtin: true },
  { name: 'aur', url: 'https://aur.archlinux.org/packages?K=%s', description: 'Arch User Repository', builtin: true },
];

export function mergeBangs(
  custom: Record<string, { url: string; description?: string }> = {},
): BangDefinition[] {
  const map = new Map<string, BangDefinition>();
  for (const b of BUILTIN_BANGS) map.set(b.name, { ...b });
  for (const [name, def] of Object.entries(custom)) {
    map.set(name.toLowerCase(), { name: name.toLowerCase(), url: def.url, description: def.description });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveBangUrl(template: string, query: string): string {
  const encoded = encodeURIComponent(query);
  if (template.includes('%s')) return template.replace(/%s/g, encoded);
  const sep = template.includes('?') ? '&' : '?';
  return `${template}${sep}q=${encoded}`;
}

export function bangToCommand(name: string, query: string, custom: Record<string, { url: string }> = {}): string | null {
  const all = mergeBangs(custom);
  const bang = all.find((b) => b.name === name.toLowerCase());
  if (!bang) return null;

  if (bang.url.startsWith('bookmark:')) {
    return `bookmark ${query}`;
  }

  const url = resolveBangUrl(bang.url, query);
  return `go ${url}`;
}

export function parseBangInvocation(input: string): { name: string; query: string } | null {
  const trimmed = input.trim();
  const goBang = trimmed.match(/^go\s+!([a-z0-9_-]+)\s+(.+)$/i);
  if (goBang) return { name: goBang[1]!.toLowerCase(), query: goBang[2]!.trim() };

  const direct = trimmed.match(/^!([a-z0-9_-]+)\s+(.+)$/i);
  if (direct) return { name: direct[1]!.toLowerCase(), query: direct[2]!.trim() };

  return null;
}