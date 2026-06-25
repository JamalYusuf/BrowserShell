import { describe, expect, it } from 'vitest';
import { TerminalEditor } from '@/terminal/editor';
import type { VirtualFileSystem } from '@/vfs';

function mockTerminal() {
  const writes: string[] = [];
  return {
    cols: 80,
    rows: 24,
    write: (s: string) => { writes.push(s); },
    clear: () => { writes.push('__clear__'); },
    writes,
  };
}

function mockVfs(): VirtualFileSystem {
  const files = new Map<string, string>();
  return {
    resolve: (path: string) => path,
    read: async (path: string) => {
      if (!files.has(path)) throw new Error('ENOENT');
      return files.get(path)!;
    },
    write: async (path: string, content: string) => {
      files.set(path, content);
    },
    files,
  } as unknown as VirtualFileSystem;
}

describe('TerminalEditor', () => {
  it('inserts printable characters', () => {
    const term = mockTerminal();
    const vfs = mockVfs();
    const editor = new TerminalEditor({
      terminal: term as never,
      vfs,
      cwd: '/',
      filename: '/notes/test.md',
      initialContent: 'hi',
      onExit: () => {},
    });

    editor.handleInput('!');
    expect(editor.getLines().join('\n')).toBe('hi!');
    expect(editor.getCursor().col).toBe(3);
  });

  it('moves with arrow escape sequences', () => {
    const term = mockTerminal();
    const vfs = mockVfs();
    const editor = new TerminalEditor({
      terminal: term as never,
      vfs,
      cwd: '/',
      filename: '/notes/a.md',
      initialContent: 'ab\ncd',
      onExit: () => {},
    });

    editor.handleInput('\x1b[B');
    expect(editor.getCursor()).toEqual({ row: 1, col: 2 });
    editor.handleInput('\x1b[D');
    expect(editor.getCursor()).toEqual({ row: 1, col: 1 });
  });

  it('does not treat plain j as cursor-down (regression)', () => {
    const term = mockTerminal();
    const vfs = mockVfs();
    const editor = new TerminalEditor({
      terminal: term as never,
      vfs,
      cwd: '/',
      filename: '/notes/a.md',
      initialContent: '',
      bindings: [{ strokes: [{ key: 'j' }], action: 'cursor-down', scope: 'editor' }],
      onExit: () => {},
    });

    editor.handleInput('j');
    expect(editor.getLines()[0]).toBe('j');
  });

  it('saves to vfs on Ctrl+S', async () => {
    const term = mockTerminal();
    const vfs = mockVfs();
    let exited = false;
    const editor = new TerminalEditor({
      terminal: term as never,
      vfs,
      cwd: '/',
      filename: '/notes/save.md',
      initialContent: 'draft',
      onExit: () => { exited = true; },
    });

    editor.handleInput('!');
    editor.handleInput('\x13');
    await new Promise((r) => setTimeout(r, 0));
    expect((vfs as unknown as { files: Map<string, string> }).files.get('/notes/save.md')).toBe('draft!');
    expect(exited).toBe(false);
  });
});