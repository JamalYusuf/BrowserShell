/**
 * Simple in-terminal file editor — arrow keys, type to edit, Ctrl+S save, Esc exit.
 */

import type { Terminal } from '@xterm/xterm';
import type { VirtualFileSystem } from '@/vfs';
import { toTerminalOutput } from '@/shell/terminal-write';
import { ANSI, color } from '@/shell/output';
import { KeySequenceEngine, dataToStroke, type SequenceBinding } from '@/shared/key-sequence';

export interface EditorOptions {
  terminal: Terminal;
  vfs: VirtualFileSystem;
  cwd: string;
  filename?: string;
  initialContent?: string;
  bindings?: SequenceBinding[];
  onExit: (saved: boolean) => void;
  onSave?: (path: string, content: string) => Promise<void>;
}

export class TerminalEditor {
  private lines: string[] = [''];
  private cursorRow = 0;
  private cursorCol = 0;
  private dirty = false;
  private filename: string;
  private statusMessage = '';
  private commandBuffer = '';
  private awaitingCommand = false;
  private keyEngine = new KeySequenceEngine();

  constructor(private options: EditorOptions) {
    this.filename = options.filename ?? '[No Name]';
    if (options.initialContent) {
      this.lines = options.initialContent.split('\n');
      if (!this.lines.length) this.lines = [''];
      this.cursorRow = Math.max(0, this.lines.length - 1);
      this.cursorCol = this.currentLine().length;
    }
  }

  activate(): void {
    this.cursorRow = Math.max(0, this.lines.length - 1);
    this.cursorCol = this.currentLine().length;
    this.options.terminal.clear();
    this.render();
  }

  handleInput(data: string): boolean {
    if (this.awaitingCommand) {
      return this.handleCommandInput(data);
    }

    if (this.tryBinding(data)) return true;

    if (data === '\x13') {
      void this.save().then(() => this.render());
      return true;
    }

    if (data === '\x11') {
      void this.save().then((saved) => this.quit(saved));
      return true;
    }

    if (data === '\x1b') {
      if (this.dirty) {
        this.statusMessage = 'Unsaved changes — :w then :q, or :q! to discard';
        this.render();
      } else {
        this.quit(false);
      }
      return true;
    }

    if (data.charCodeAt(0) === 13) {
      const before = this.currentLine().slice(0, this.cursorCol);
      const after = this.currentLine().slice(this.cursorCol);
      this.lines[this.cursorRow] = before;
      this.lines.splice(this.cursorRow + 1, 0, after);
      this.cursorRow++;
      this.cursorCol = 0;
      this.dirty = true;
      this.render();
      return true;
    }

    if (data.charCodeAt(0) === 127 || data === '\x7f') {
      if (this.cursorCol > 0) {
        const line = this.currentLine();
        this.lines[this.cursorRow] = line.slice(0, this.cursorCol - 1) + line.slice(this.cursorCol);
        this.cursorCol--;
        this.dirty = true;
        this.render();
      } else if (this.cursorRow > 0) {
        const prev = this.lines[this.cursorRow - 1]!;
        const cur = this.currentLine();
        this.cursorCol = prev.length;
        this.lines[this.cursorRow - 1] = prev + cur;
        this.lines.splice(this.cursorRow, 1);
        this.cursorRow--;
        this.dirty = true;
        this.render();
      }
      return true;
    }

    if (data === '\x1b[A') { this.moveUp(); this.render(); return true; }
    if (data === '\x1b[B') { this.moveDown(); this.render(); return true; }
    if (data === '\x1b[C') { this.moveRight(); this.render(); return true; }
    if (data === '\x1b[D') { this.moveLeft(); this.render(); return true; }
    if (data === '\x1b[H') { this.cursorCol = 0; this.render(); return true; }
    if (data === '\x1b[F') {
      this.cursorCol = this.currentLine().length;
      this.render();
      return true;
    }

    if (data === ':') {
      this.awaitingCommand = true;
      this.commandBuffer = ':';
      this.options.terminal.write('\r\n:');
      return true;
    }

    const code = data.charCodeAt(0);
    if (code >= 32) {
      const line = this.currentLine();
      this.lines[this.cursorRow] = line.slice(0, this.cursorCol) + data + line.slice(this.cursorCol);
      this.cursorCol += data.length;
      this.dirty = true;
      this.render();
      return true;
    }

    return true;
  }

  /** Editor bindings — only Ctrl/Meta shortcuts (not plain hjkl). */
  private tryBinding(data: string): boolean {
    const bindings = this.options.bindings;
    if (!bindings?.length) return false;

    const stroke = dataToStroke(data);
    if (!stroke) return false;
    if (!stroke.ctrl && !stroke.meta && !stroke.alt) return false;

    const result = this.keyEngine.match(stroke, bindings, 'editor');
    if (!result) return false;

    switch (result.action) {
      case 'save':
        void this.save().then(() => this.render());
        return true;
      case 'save-and-exit':
        void this.save().then((saved) => this.quit(saved));
        return true;
      default:
        return true;
    }
  }

  private handleCommandInput(data: string): boolean {
    if (data === '\x1b') {
      this.awaitingCommand = false;
      this.commandBuffer = '';
      this.render();
      return true;
    }
    if (data.charCodeAt(0) === 127) {
      if (this.commandBuffer.length > 1) {
        this.commandBuffer = this.commandBuffer.slice(0, -1);
        this.options.terminal.write('\b \b');
      }
      return true;
    }
    if (data.charCodeAt(0) === 13) {
      void this.executeCommand(this.commandBuffer.slice(1).trim());
      return true;
    }
    if (data.charCodeAt(0) >= 32) {
      this.commandBuffer += data;
      this.options.terminal.write(data);
    }
    return true;
  }

  private async executeCommand(cmd: string): Promise<void> {
    this.awaitingCommand = false;
    this.commandBuffer = '';
    this.options.terminal.write('\r\n');

    if (cmd === 'q') {
      if (this.dirty) {
        this.statusMessage = 'No write since last change (:w first, or :q!)';
        this.render();
        return;
      }
      this.quit(false);
      return;
    }
    if (cmd === 'w' || cmd === 'wq' || cmd === 'x') {
      const saved = await this.save();
      if (cmd === 'wq' || cmd === 'x') this.quit(saved);
      else this.render();
      return;
    }
    if (cmd === 'q!' || cmd === 'quit!') {
      this.quit(false);
      return;
    }

    this.statusMessage = `Unknown: :${cmd}`;
    this.render();
  }

  async save(): Promise<boolean> {
    const content = this.lines.join('\n');
    const path = this.options.filename;
    if (!path || path === '[No Name]' || path === '-' || path === '[stdin]') {
      this.statusMessage = 'No file name — edit /notes/file.txt';
      return false;
    }
    try {
      const resolved = this.options.vfs.resolve(path, this.options.cwd);
      if (this.options.onSave) {
        await this.options.onSave(resolved, content);
      } else {
        await this.options.vfs.write(resolved, content);
      }
      this.dirty = false;
      this.statusMessage = `Saved ${resolved}`;
      return true;
    } catch (e) {
      this.statusMessage = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  private quit(saved: boolean): void {
    this.options.terminal.clear();
    this.options.onExit(saved);
  }

  getLines(): string[] {
    return [...this.lines];
  }

  getCursor(): { row: number; col: number } {
    return { row: this.cursorRow, col: this.cursorCol };
  }

  private currentLine(): string {
    return this.lines[this.cursorRow] ?? '';
  }

  private moveLeft(): void {
    if (this.cursorCol > 0) this.cursorCol--;
    else if (this.cursorRow > 0) {
      this.cursorRow--;
      this.cursorCol = this.currentLine().length;
    }
  }

  private moveRight(): void {
    const line = this.currentLine();
    if (this.cursorCol < line.length) this.cursorCol++;
    else if (this.cursorRow < this.lines.length - 1) {
      this.cursorRow++;
      this.cursorCol = 0;
    }
  }

  private moveUp(): void {
    if (this.cursorRow > 0) {
      this.cursorRow--;
      this.cursorCol = Math.min(this.cursorCol, this.currentLine().length);
    }
  }

  private moveDown(): void {
    if (this.cursorRow < this.lines.length - 1) {
      this.cursorRow++;
      this.cursorCol = Math.min(this.cursorCol, this.currentLine().length);
    }
  }

  private render(): void {
    const cols = this.options.terminal.cols;
    const rows = Math.max(1, this.options.terminal.rows - 2);
    this.options.terminal.write('\x1b[H\x1b[2J');

    for (let i = 0; i < Math.min(this.lines.length, rows); i++) {
      const num = String(i + 1).padStart(4);
      const line = this.lines[i]!.slice(0, Math.max(0, cols - 6));
      this.options.terminal.write(color(`${num} `, ANSI.dim) + line + '\r\n');
    }

    const dirty = this.dirty ? ' [+]' : '';
    const status = `${this.filename}${dirty}  ${this.cursorRow + 1}:${this.cursorCol + 1}`;
    const msg = this.statusMessage ? `  | ${this.statusMessage}` : '';
    this.options.terminal.write(color(`\r\n${status}${msg}`, ANSI.cyan));
    this.options.terminal.write(color('  Ctrl+S save · Esc exit · :w :q', ANSI.dim));
    this.statusMessage = '';

    const viewRow = Math.min(this.cursorRow, rows - 1);
    const viewCol = Math.min(this.cursorCol, Math.max(0, cols - 7));
    this.options.terminal.write(`\x1b[${viewRow + 1};${viewCol + 6}H`);
  }
}

export function formatEditorHelp(): string {
  return toTerminalOutput(
    [
      color('Editor — quick reference', ANSI.cyan),
      '  Arrow keys   move cursor',
      '  Type         insert text',
      '  Enter        new line',
      '  Backspace    delete',
      '  Ctrl+S       save',
      '  Esc          exit (warns if unsaved)',
      '  :w           save    :wq  save & quit    :q  quit',
      '',
      '  edit /notes/todo.md',
      '  edit /config/rc',
      '  touch /notes/new.md && edit /notes/new.md',
    ].join('\n'),
  );
}