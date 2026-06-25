import { describe, expect, it } from 'vitest';
import { assignHintLabels } from '@/content/vimium/hint-labels';

describe('assignHintLabels', () => {
  const chars = 'abcd';

  it('uses single characters for small counts', () => {
    expect(assignHintLabels(3, chars)).toEqual(['a', 'b', 'c']);
  });

  it('uses multi-char labels when needed', () => {
    const labels = assignHintLabels(6, chars);
    expect(labels).toHaveLength(6);
    expect(labels.every((l) => l.length >= 2)).toBe(true);
    expect(new Set(labels).size).toBe(6);
  });

  it('produces unique prefixes for filtering', () => {
    const labels = assignHintLabels(10, 'ab');
    const prefixed = labels.filter((l) => l.startsWith('a'));
    expect(prefixed.length).toBeGreaterThan(1);
  });
});