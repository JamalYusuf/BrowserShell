import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { VirtualFileSystem } from '@/vfs';
import { normalizePath, joinPath } from '@/vfs/path';

describe('path utilities', () => {
  it('normalizes paths', () => {
    expect(normalizePath('/tabs/1')).toBe('/tabs/1');
    expect(normalizePath('tabs', '/')).toBe('/tabs');
    expect(normalizePath('../tabs', '/bookmarks/work')).toBe('/bookmarks/tabs');
  });

  it('joins paths', () => {
    expect(joinPath('/tabs', '1', 'meta.json')).toBe('/tabs/1/meta.json');
  });
});

describe('VirtualFileSystem', () => {
  const chrome = createMockChromeAPI();
  const vfs = new VirtualFileSystem(chrome);

  it('lists root directories', async () => {
    const entries = await vfs.readdir('/');
    const names = entries.map((e) => e.name);
    expect(names).toContain('tabs');
    expect(names).toContain('bookmarks');
    expect(names).toContain('downloads');
    expect(names).toContain('current');
  });

  it('lists tabs', async () => {
    const entries = await vfs.readdir('/tabs');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]!.type).toBe('directory');
  });

  it('reads tab metadata', async () => {
    const content = await vfs.read('/tabs/1/meta.json');
    expect(content).toContain('"id"');
    expect(content).toContain('1');
  });

  it('resolves relative paths', () => {
    expect(vfs.resolve('tabs', '/')).toBe('/tabs');
    expect(vfs.resolve('.', '/tabs')).toBe('/tabs');
  });

  it('lists bookmark folders at root', async () => {
    const entries = await vfs.readdir('/bookmarks');
    const names = entries.map((e) => e.name);
    expect(names).toContain('Work');
    expect(names).toContain('Personal');
  });

  it('lists nested bookmark folders', async () => {
    const entries = await vfs.readdir('/bookmarks/Work');
    expect(entries.length).toBe(2);
    const titles = entries.map((e) => e.meta?.title);
    expect(titles).toContain('Project');
    expect(titles).toContain('Docs');
  });

  it('lists history with readable names', async () => {
    const entries = await vfs.readdir('/history');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]!.name).toMatch(/^\d{3}-/);
    expect(entries[0]!.meta?.title).toBeTruthy();
    expect(entries[0]!.meta?.url).toBeTruthy();
  });

  it('lists downloads with readable names', async () => {
    const entries = await vfs.readdir('/downloads');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]!.name).toMatch(/^\d{3}-/);
    expect(entries[0]!.meta?.filename).toBeTruthy();
    expect(entries[0]!.meta?.state).toBeTruthy();
  });
});