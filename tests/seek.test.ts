import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { closeSeek, handleSeekKeydown, isSeekActive, openSeek } from '@/content/vimium/seek';

describe('vimium seek', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    closeSeek();
  });

  afterEach(() => {
    closeSeek();
  });

  it('opens and closes seek bar', () => {
    openSeek();
    expect(isSeekActive()).toBe(true);
    closeSeek();
    expect(isSeekActive()).toBe(false);
  });

  it('accumulates multiple characters via capture handler', () => {
    openSeek();
    const input = document.querySelector('.bs-seek-bar input') as HTMLInputElement;
    expect(input.readOnly).toBe(true);

    for (const ch of 'hello') {
      const e = new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true });
      expect(handleSeekKeydown(e)).toBe(true);
      expect(e.defaultPrevented).toBe(true);
    }

    expect(input.value).toBe('hello');
  });

  it('types n as a character instead of find-next while seek is open', () => {
    openSeek();
    handleSeekKeydown(new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
    handleSeekKeydown(new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true }));
    handleSeekKeydown(new KeyboardEvent('keydown', { key: 'd', bubbles: true, cancelable: true }));

    const input = document.querySelector('.bs-seek-bar input') as HTMLInputElement;
    expect(input.value).toBe('and');
  });

  it('handles backspace in capture handler', () => {
    openSeek();
    handleSeekKeydown(new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
    handleSeekKeydown(new KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true }));
    handleSeekKeydown(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));

    const input = document.querySelector('.bs-seek-bar input') as HTMLInputElement;
    expect(input.value).toBe('a');
  });
});