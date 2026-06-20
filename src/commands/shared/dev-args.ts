import { filterFlags } from './args';

export function parseTabArg(args: string[]): { tabArg?: string; rest: string[] } {
  const parts = filterFlags(args).filter((a) => !a.startsWith('--'));
  if (parts.length > 1 && /^\d+@\d+$/.test(parts[parts.length - 1]!)) {
    return { tabArg: parts.pop(), rest: parts };
  }
  const last = parts[parts.length - 1];
  if (parts.length > 1 && last && /^\d+$/.test(last)) {
    return { tabArg: parts.pop(), rest: parts };
  }
  return { rest: parts };
}

export function parseStorageArgs(args: string[]): {
  tabArg?: string;
  area: 'local' | 'session';
  action: 'list' | 'get';
  key?: string;
  pattern: string;
} {
  const { tabArg, rest } = parseTabArg(args);
  let area: 'local' | 'session' = 'local';
  let action: 'list' | 'get' = 'list';
  let key: string | undefined;
  let pattern = '';

  const parts = [...rest];
  if (parts[0] === 'session' || parts[0] === 'local') {
    area = parts.shift() as 'local' | 'session';
  }
  if (parts[0] === 'get') {
    action = 'get';
    parts.shift();
    const tail = parts[parts.length - 1];
    if (tail === 'session' || tail === 'local') {
      area = parts.pop() as 'local' | 'session';
    }
    key = parts.join(' ').trim() || undefined;
  } else {
    pattern = parts.join(' ').trim();
  }

  return { tabArg, area, action, key, pattern };
}