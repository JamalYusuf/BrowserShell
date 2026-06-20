import { stripAnsi } from './output';

export interface ClickableList {
  count: number;
  command: (index: number) => string;
}

/** Match a numbered list row (buffer text has no ANSI sequences). Returns full-row link range. */
export function matchListRowIndex(line: string): { index: number; xStart: number; xEnd: number } | undefined {
  const plain = stripAnsi(line);
  const match = plain.match(/^#?(\d+)\s{2,}/);
  if (!match?.[1]) return undefined;

  const digits = match[1];
  const xStart = plain.indexOf(digits);
  if (xStart < 0) return undefined;
  const trimmed = plain.trimEnd();
  const xEnd = Math.max(xStart + digits.length - 1, trimmed.length - 1);
  return { index: Number(digits), xStart, xEnd };
}

/** Convert 0-based buffer column to xterm's 1-based link range. */
export function toLinkRange(y1Based: number, xStart: number, xEnd: number) {
  return {
    start: { x: xStart + 1, y: y1Based },
    end: { x: xEnd + 1, y: y1Based },
  };
}
