import { stripAnsi } from './output';

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

export interface BufferUrlHit {
  url: string;
  xStart: number;
  xEnd: number;
}

/** Find http(s) URLs in a terminal buffer line (plain text, no ANSI). */
export function findUrlsInLine(line: string): BufferUrlHit[] {
  const plain = stripAnsi(line);
  const hits: BufferUrlHit[] = [];
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(plain)) !== null) {
    const url = match[0]!;
    const xStart = match.index;
    const xEnd = xStart + url.length - 1;
    hits.push({ url, xStart, xEnd });
  }
  return hits;
}