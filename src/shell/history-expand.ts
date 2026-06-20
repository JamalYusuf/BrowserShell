/** Shell history and bang-search expansions. */

const BANG_URLS: Record<string, (query: string) => string> = {
  g: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  gh: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
  yt: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  w: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
  so: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
};

const BANG_COMMANDS: Record<string, (query: string) => string> = {
  bm: (q) => `bookmark ${q}`,
};

export function expandShellHistory(input: string, lastCommand: string): string {
  const trimmed = input.trim();
  if (trimmed === '!!') return lastCommand;
  if (trimmed.includes('!!') && lastCommand) {
    return trimmed.replace(/!!/g, lastCommand);
  }
  return input;
}

export function expandBang(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/^!([a-z]{1,4})\s+(.+)$/i);
  if (!match) return input;

  const bang = match[1]!.toLowerCase();
  const query = match[2]!.trim();
  const cmd = BANG_COMMANDS[bang];
  if (cmd) return cmd(query);

  const builder = BANG_URLS[bang];
  if (!builder) return input;

  return `go ${builder(query)}`;
}