import type { VFSEntry } from '@/shared/types';

export function bookmarkPlainLine(e: VFSEntry): string {
  const title = (e.meta?.title as string) ?? e.name;
  const url = (e.meta?.url as string) ?? '';
  return e.type === 'directory'
    ? `${e.name}/\tfolder\t${title}`
    : `${e.name}\tlink\t${title}\t${url}`;
}

export function historyPlainLine(e: VFSEntry): string {
  const index = (e.meta?.index as number) ?? 0;
  const title = (e.meta?.title as string) ?? e.name;
  const url = (e.meta?.url as string) ?? '';
  return `${index}\t${title}\t${url}`;
}