import type { ExecutionContext } from '@/shared/types';
import { basename, normalizePath } from '@/vfs/path';
import { readTranscript as readSessionTranscript } from '@/shell/transcript';

export function expandHomePath(path: string, home: string): string {
  const trimmed = path.trim();
  if (trimmed === '~') return home;
  if (trimmed.startsWith('~/')) return normalizePath(trimmed.slice(2), home);
  return normalizePath(trimmed);
}

export function resolveTranscriptPath(raw: string | undefined, ctx: ExecutionContext): string {
  const fallback = '/scripts/browsershell-session.txt';
  if (!raw) return fallback;
  return expandHomePath(raw, ctx.env.HOME ?? '/');
}

export async function saveTranscriptToPath(
  ctx: ExecutionContext,
  vfsPath: string,
  content: string
): Promise<{ vfsPath: string; downloadName: string }> {
  const name = basename(vfsPath) || 'browsershell-session.txt';
  const target =
    vfsPath.startsWith('/scripts/') || vfsPath === '/scripts'
      ? vfsPath.endsWith('.txt') || vfsPath.endsWith('.log')
        ? vfsPath
        : `/scripts/${name}`
      : `/scripts/${name}`;

  await ctx.vfs.write(target, content);
  return { vfsPath: target, downloadName: name };
}

export function downloadTranscriptFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function readTranscript(): string {
  return readSessionTranscript();
}