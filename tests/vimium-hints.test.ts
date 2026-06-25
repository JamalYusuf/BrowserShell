import { describe, expect, it } from 'vitest';
import { collectClickables, dedupeNested, sortClickables } from '@/content/vimium/clickables';

describe('vimium clickables', () => {
  it('collects anchors and buttons from the DOM', () => {
    document.body.innerHTML = `
      <a href="https://example.com">Example</a>
      <button type="button">Go</button>
      <a href="javascript:void(0)">Skip</a>
    `;
    for (const el of document.querySelectorAll('a, button')) {
      (el as HTMLElement).getBoundingClientRect = () => new DOMRect(0, 0, 120, 32);
    }
    const items = collectClickables();
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.some((i) => i.label.includes('Example'))).toBe(true);
    expect(items.some((i) => i.label === 'Go')).toBe(true);
    expect(items.every((i) => !i.href?.startsWith('javascript:'))).toBe(true);
  });

  it('dedupes nested clickables', () => {
    const outer = document.createElement('a');
    outer.href = 'https://a.test';
    outer.textContent = 'Outer';
    outer.getBoundingClientRect = () => new DOMRect(0, 0, 200, 40);
    const inner = document.createElement('span');
    inner.textContent = 'Inner';
    inner.getBoundingClientRect = () => new DOMRect(10, 10, 40, 20);
    outer.appendChild(inner);
    document.body.innerHTML = '';
    document.body.appendChild(outer);

    const nested = dedupeNested([
      { element: outer, rect: outer.getBoundingClientRect(), pageX: 0, pageY: 0, href: outer.href, label: 'Outer' },
      { element: inner, rect: inner.getBoundingClientRect(), pageX: 10, pageY: 10, label: 'Inner' },
    ]);
    expect(nested).toHaveLength(1);
    expect(nested[0]?.element).toBe(outer);
  });

  it('filters to viewport when viewportOnly is true', () => {
    const inView = document.createElement('a');
    inView.href = 'https://in.test';
    inView.textContent = 'In';
    inView.getBoundingClientRect = () => new DOMRect(10, 10, 80, 24);

    const outView = document.createElement('a');
    outView.href = 'https://out.test';
    outView.textContent = 'Out';
    outView.getBoundingClientRect = () => new DOMRect(10, window.innerHeight + 200, 80, 24);

    document.body.innerHTML = '';
    document.body.append(inView, outView);

    const items = collectClickables({ viewportOnly: true });
    expect(items.some((i) => i.label === 'In')).toBe(true);
    expect(items.some((i) => i.label === 'Out')).toBe(false);
  });

  it('sorts clickables top-to-bottom', () => {
    const a = document.createElement('a');
    a.href = 'https://a.test';
    a.getBoundingClientRect = () => new DOMRect(0, 100, 40, 20);
    const b = document.createElement('a');
    b.href = 'https://b.test';
    b.getBoundingClientRect = () => new DOMRect(0, 10, 40, 20);
    const sorted = sortClickables([
      { element: a, rect: a.getBoundingClientRect(), pageX: 0, pageY: 100, href: a.href, label: 'a' },
      { element: b, rect: b.getBoundingClientRect(), pageX: 0, pageY: 10, href: b.href, label: 'b' },
    ]);
    expect(sorted[0]?.label).toBe('b');
  });
});