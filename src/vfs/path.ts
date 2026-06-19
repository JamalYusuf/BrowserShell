/** Virtual path utilities. */

export function normalizePath(path: string, cwd = '/'): string {
  const base = path.startsWith('/') ? path : joinPath(cwd, path);
  const parts = base.split('/').filter(Boolean);
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return '/' + stack.join('/');
}

export function joinPath(...segments: string[]): string {
  const joined = segments
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return '/' + joined;
}

export function basename(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export function dirname(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

export function isChildPath(parent: string, child: string): boolean {
  const p = normalizePath(parent);
  const c = normalizePath(child);
  return c === p || c.startsWith(p + '/');
}