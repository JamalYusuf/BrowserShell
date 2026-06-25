/** Assign unique hint strings (Vimium-style alphabet hints). */

export function assignHintLabels(count: number, chars: string): string[] {
  if (count <= 0 || !chars.length) return [];
  if (count <= chars.length) return [...chars.slice(0, count)];

  const labels: string[] = [];
  for (let len = 2; labels.length < count && len <= 8; len++) {
    const walk = (prefix: string) => {
      if (labels.length >= count) return;
      if (prefix.length === len) {
        labels.push(prefix);
        return;
      }
      for (const c of chars) walk(prefix + c);
    };
    walk('');
  }
  return labels.slice(0, count);
}