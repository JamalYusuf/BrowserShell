import { describe, expect, it } from 'vitest';
import { isEditableFocusTarget } from '@/content/page-focus';

describe('page-focus', () => {
  it('treats text inputs as editable', () => {
    const input = document.createElement('input');
    input.type = 'text';
    expect(isEditableFocusTarget(input)).toBe(true);
  });

  it('ignores button-like inputs', () => {
    const input = document.createElement('input');
    input.type = 'button';
    expect(isEditableFocusTarget(input)).toBe(false);
  });

  it('ignores plain divs', () => {
    expect(isEditableFocusTarget(document.createElement('div'))).toBe(false);
  });
});