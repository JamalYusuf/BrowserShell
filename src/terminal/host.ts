import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { SearchAddon } from '@xterm/addon-search';

import { createChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { applyCompletion, getShellCompletions, longestCommonPrefix, parseCompletionInput } from '@/shell/completion';
import { ShellExecutor } from '@/shell/executor';
import { ANSI, color, heading } from '@/shell/output';
import { toTerminalOutput } from '@/shell/terminal-write';
import { addHistoryEntry, getHistory, loadConfig, saveConfig } from '@/shared/storage';
import type { ShellConfig } from '@/shared/types';
import { FONT_PRESETS, getThemePreset } from '@/shared/themes';
import { matchesToggleKey, toggleKeyLabel } from '@/shared/toggle-key';

export interface TerminalHostOptions {
  container: HTMLElement;
  compact?: boolean;
}

export class TerminalHost {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private searchAddon: SearchAddon;
  private executor: ShellExecutor;
  private inputBuffer = '';
  private history: string[] = [];
  private historyIndex = -1;
  private cwd = '/';
  private running = false;
  private config: ShellConfig | null = null;
  private lastCompletions: string[] = [];
  private reverseSearchActive = false;
  private reverseSearchQuery = '';
  private reverseSearchMatches: string[] = [];
  private reverseSearchMatchIndex = 0;

  constructor(private options: TerminalHostOptions) {
    registerAllCommands();

    this.terminal = new Terminal({
      theme: getThemePreset('github-dark').xterm,
      fontFamily: FONT_PRESETS[0]!.family,
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: true,
      convertEol: true,
      scrollOnUserInput: true,
    });

    this.fitAddon = new FitAddon();
    this.searchAddon = new SearchAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.searchAddon);

    this.executor = new ShellExecutor({
      chrome: createChromeAPI(),
      getCols: () => this.terminal.cols,
      onOutput: (stream, text) => this.writeOutput(stream, text),
    });
  }

  async init(): Promise<void> {
    this.terminal.open(this.options.container);

    try {
      this.terminal.loadAddon(new WebglAddon());
    } catch {
      // canvas fallback
    }

    this.fitAddon.fit();
    const resizeObserver = new ResizeObserver(() => this.fitAddon.fit());
    resizeObserver.observe(this.options.container);
    window.addEventListener('resize', () => this.fitAddon.fit());

    this.config = await loadConfig();
    this.applyConfig(this.config);

    await this.executor.initialize();
    this.cwd = this.executor.getCwd();
    this.history = await getHistory();

    if (!this.config.firstRunComplete) {
      this.writeBanner();
      await saveConfig({ firstRunComplete: true });
    } else if (!this.options.compact) {
      this.terminal.write(
        toTerminalOutput(color('BrowserShell ready. Tab to complete, ↑↓ history, Ctrl+R search. Press ` to toggle.\n', ANSI.dim))
      );
    }

    this.writePrompt();
    this.terminal.onData((data) => this.handleInput(data));
    this.terminal.attachCustomKeyEventHandler((e) => this.handleKeyEvent(e));

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.config?.newValue) {
        this.applyConfig(changes.config.newValue as ShellConfig);
      }
    });

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'browsershell-focus') {
        this.terminal.focus();
      }
    });

    const pending = await chrome.storage.local.get('pendingCommand');
    if (pending.pendingCommand) {
      await chrome.storage.local.remove('pendingCommand');
      this.inputBuffer = pending.pendingCommand as string;
      this.terminal.write(this.inputBuffer);
    }
  }

  focus(): void {
    this.terminal.focus();
  }

  private applyConfig(config: ShellConfig): void {
    this.config = config;
    const preset = getThemePreset(config.theme);
    const font = FONT_PRESETS.find((f) => f.id === config.fontFamily) ?? FONT_PRESETS[0]!;

    this.terminal.options.theme = preset.xterm;
    this.terminal.options.fontFamily = font.family;
    this.terminal.options.fontSize = config.fontSize;
    this.terminal.options.lineHeight = config.lineHeight;
    this.terminal.options.cursorBlink = config.cursorBlink;
  }

  private writeBanner(): void {
    const banner = [
      color('╔══════════════════════════════════════╗', ANSI.cyan),
      color('║       BrowserShell v0.1.0            ║', ANSI.cyan),
      color('╚══════════════════════════════════════╝', ANSI.cyan),
      '',
      heading('Welcome to BrowserShell!'),
      `Type ${color('help', ANSI.green)} to explore or ${color('man intro', ANSI.green)} for a tour.`,
      `Press ${color(toggleKeyLabel(this.config?.toggleKey), ANSI.yellow)} to toggle the overlay.`,
      '',
    ].join('\n');
    this.terminal.write(toTerminalOutput(banner));
  }

  private writeOutput(stream: 'stdout' | 'stderr', text: string): void {
    const normalized = toTerminalOutput(text);
    if (stream === 'stderr') {
      this.terminal.write(color(normalized, ANSI.red));
    } else {
      this.terminal.write(normalized);
    }
  }

  private getPromptColor(): string {
    const preset = getThemePreset(this.config?.theme ?? 'github-dark');
    return this.config?.promptColor || preset.promptColor;
  }

  private formatPrompt(): string {
    const user = this.executor.getEnv().USER ?? 'browser';
    const shortCwd = this.cwd === '/' ? '/' : this.cwd.replace(/^\/+/, '');
    const promptText = `${user}@browser:${shortCwd}$ `;
    return `\n\x1b[38;2;${hexToRgb(this.getPromptColor())}m${promptText}\x1b[0m`;
  }

  private writePrompt(): void {
    this.terminal.write(this.formatPrompt());
  }

  private handleKeyEvent(e: KeyboardEvent): boolean {
    if (e.ctrlKey && e.shiftKey && e.key === 'F') return false;

    if (e.ctrlKey && e.key === 'l') {
      this.terminal.clear();
      this.writePrompt();
      return false;
    }

    if (e.ctrlKey && e.key === 'r') {
      this.startReverseSearch();
      return false;
    }

    if (e.ctrlKey && e.key === 'g' && this.reverseSearchActive) {
      this.cancelReverseSearch();
      return false;
    }

    if (e.key === 'c' && e.ctrlKey) {
      if (this.reverseSearchActive) {
        this.cancelReverseSearch();
        return false;
      }
      this.terminal.write('^C\n');
      this.inputBuffer = '';
      this.historyIndex = -1;
      this.writePrompt();
      return false;
    }

    if (this.options.compact && this.config && !e.repeat && matchesToggleKey(e, this.config.toggleKey)) {
      window.parent.postMessage({ type: 'browsershell-toggle' }, '*');
      return false;
    }

    if (e.key === 'Escape' && this.options.compact) {
      window.parent.postMessage({ type: 'browsershell-close' }, '*');
      return false;
    }

    return true;
  }

  private async handleInput(data: string): Promise<void> {
    if (this.running) return;

    if (this.reverseSearchActive) {
      await this.handleReverseSearchInput(data);
      return;
    }

    const code = data.charCodeAt(0);

    if (code === 13) {
      const command = this.inputBuffer.trim();
      this.terminal.write('\n');
      this.inputBuffer = '';
      this.historyIndex = -1;
      this.lastCompletions = [];

      if (command) {
        await addHistoryEntry(command);
        this.history = await getHistory();
        await this.runCommand(command);
      }

      this.cwd = this.executor.getCwd();
      this.writePrompt();
      return;
    }

    if (code === 127 || data === '\x7f') {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.terminal.write('\b \b');
      }
      return;
    }

    if (data === '\x1b[A' || data === '\x0e') {
      if (this.history.length > 0 && this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.replaceInput(this.history[this.history.length - 1 - this.historyIndex]!);
      }
      return;
    }

    if (data === '\x1b[B' || data === '\x0f') {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.replaceInput(this.history[this.history.length - 1 - this.historyIndex]!);
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.replaceInput('');
      }
      return;
    }

    if (data === '\x01') {
      // Ctrl+A — cursor assumed at end; redraw line (beginning not tracked)
      return;
    }

    if (data === '\x05') {
      // Ctrl+E — no-op when cursor at end
      return;
    }

    if (data === '\x15') {
      // Ctrl+U — kill line
      this.replaceInput('');
      return;
    }

    if (data === '\x17') {
      // Ctrl+W — delete last word
      const trimmed = this.inputBuffer.replace(/\s+$/, '');
      const next = trimmed.replace(/\S+\s*$/, '').replace(/\s+$/, '');
      this.replaceInput(next);
      return;
    }

    if (data === '\t') {
      await this.complete();
      return;
    }

    if (code >= 32) {
      this.inputBuffer += data;
      this.terminal.write(data);
    }
  }

  private replaceInput(newInput: string): void {
    while (this.inputBuffer.length > 0) {
      this.terminal.write('\b \b');
      this.inputBuffer = this.inputBuffer.slice(0, -1);
    }
    this.inputBuffer = newInput;
    this.terminal.write(newInput);
  }

  private async complete(): Promise<void> {
    const completions = await getShellCompletions({
      input: this.inputBuffer,
      vfs: this.executor.getVfs(),
      chrome: createChromeAPI(),
      env: this.executor.getEnv(),
      cwd: this.cwd,
      aliases: this.executor.getAliases(),
    });

    if (!completions.length) {
      this.terminal.write('\x07');
      return;
    }

    if (completions.length === 1) {
      this.inputBuffer = applyCompletion(this.inputBuffer, completions[0]!);
      this.replaceInput(this.inputBuffer);
      this.lastCompletions = completions;
      return;
    }

    const lcp = longestCommonPrefix(completions);
    const { currentWord } = parseCompletionInput(this.inputBuffer);

    if (lcp.length > currentWord.length) {
      this.inputBuffer = applyCompletion(this.inputBuffer, lcp);
      this.replaceInput(this.inputBuffer);
      this.lastCompletions = completions;
      return;
    }

    if (
      this.lastCompletions.length === completions.length &&
      this.lastCompletions.every((c, i) => c === completions[i])
    ) {
      this.terminal.write('\n' + color(completions.join('  '), ANSI.dim) + this.formatPrompt() + this.inputBuffer);
      return;
    }

    this.lastCompletions = completions;
    this.terminal.write('\x07');
  }

  private startReverseSearch(): void {
    this.reverseSearchActive = true;
    this.reverseSearchQuery = '';
    this.reverseSearchMatches = [...this.history].reverse();
    this.reverseSearchMatchIndex = 0;
    this.terminal.write(color("(reverse-i-search)': ", ANSI.yellow));
    this.showReverseSearchLine();
  }

  private cancelReverseSearch(): void {
    this.reverseSearchActive = false;
    this.reverseSearchQuery = '';
    this.replaceInput('');
    this.terminal.write('^C\n');
    this.writePrompt();
  }

  private showReverseSearchLine(): void {
    const match = this.reverseSearchMatches[this.reverseSearchMatchIndex] ?? '';
    this.replaceInput(match);
  }

  private async handleReverseSearchInput(data: string): Promise<void> {
    const code = data.charCodeAt(0);

    if (code === 13) {
      this.reverseSearchActive = false;
      this.reverseSearchQuery = '';
      this.terminal.write('\n');
      return;
    }

    if (data === '\x1b' || (code === 127 || data === '\x7f')) {
      if (this.reverseSearchQuery.length > 0) {
        this.reverseSearchQuery = this.reverseSearchQuery.slice(0, -1);
        this.updateReverseSearchMatches();
        this.showReverseSearchLine();
      } else {
        this.cancelReverseSearch();
      }
      return;
    }

    if (data === '\x12') {
      // Ctrl+R — cycle to next match
      if (this.reverseSearchMatches.length > 1) {
        this.reverseSearchMatchIndex = (this.reverseSearchMatchIndex + 1) % this.reverseSearchMatches.length;
        this.showReverseSearchLine();
      }
      return;
    }

    if (code >= 32 && code !== 127) {
      this.reverseSearchQuery += data;
      this.updateReverseSearchMatches();
      this.reverseSearchMatchIndex = 0;
      this.showReverseSearchLine();
    }
  }

  private updateReverseSearchMatches(): void {
    if (!this.reverseSearchQuery) {
      this.reverseSearchMatches = [...this.history].reverse();
      return;
    }
    const q = this.reverseSearchQuery.toLowerCase();
    this.reverseSearchMatches = this.history.filter((h) => h.toLowerCase().includes(q)).reverse();
    if (!this.reverseSearchMatches.length) this.reverseSearchMatches = [''];
  }

  private async runCommand(command: string): Promise<void> {
    if (command === 'clear') {
      this.terminal.clear();
      return;
    }

    this.running = true;
    try {
      await this.executor.execute(command);
    } finally {
      this.running = false;
    }
  }
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r};${g};${b}`;
}