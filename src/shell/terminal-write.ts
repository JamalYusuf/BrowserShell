/**
 * Normalize text for xterm.js.
 * LF-only newlines leave the cursor at the current column after wrapped lines,
 * causing progressive indentation in narrow panels. Always emit CRLF.
 */
export function toTerminalOutput(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
}

export function truncate(text: string, maxLen: number): string {
  if (maxLen <= 1) return '…';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}