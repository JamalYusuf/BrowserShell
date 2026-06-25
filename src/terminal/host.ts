import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { SearchAddon } from '@xterm/addon-search';

import { createChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { applyCompletion, getShellCompletions, longestCommonPrefix, parseCompletionInput } from '@/shell/completion';
import { ShellExecutor } from '@/shell/executor';
import { ANSI, color, heading } from '@/shell/output';
import { matchListRowIndex, toLinkRange, type ClickableList } from '@/shell/clickable-list';
import { findUrlsInLine } from '@/shell/url-links';
import { LinkRowHover } from '@/shell/link-hover';
import { formatPromptTemplate } from '@/shell/prompt';
import { stripAnsi } from '@/shell/output';
import { toTerminalOutput } from '@/shell/terminal-write';
import {
  appendTranscriptOutput,
  beginTranscriptEntry,
  endTranscriptEntry,
} from '@/shell/transcript';
import { tabDomain } from '@/commands/shared/url';
import { addHistoryEntry, getHistory, loadConfig, saveConfig } from '@/shared/storage';
import type { CommandResult, ShellConfig } from '@/shared/types';
import { stopWatch } from '@/shell/watch-store';
import { FONT_PRESETS, getThemePreset } from '@/shared/themes';
import { BUILD_STAMP, BUILD_VERSION } from '@/shared/build-info';
import { fetchWelcomeSnapshot, formatWelcomeLines } from '@/shared/welcome';
import { matchesToggleKey, toggleKeyLabel } from '@/shared/toggle-key';
import { TerminalEditor } from '@/terminal/editor';
import { KeySequenceEngine, eventToStroke, scopeUsesLeader } from '@/shared/key-sequence';
import { bootstrapRuntimeConfig, getCachedRuntimeConfig, preloadRuntimeConfig } from '@/shared/config-service';

/**
 * xterm.js terminal host for the overlay shell.
 *
 * Handles user input, prompt rendering, history, completion UI,
 * clickable list links, and command execution via ShellExecutor.
 */
export interface TerminalHostOptions {
  container: HTMLElement;
  compact?: boolean;
  getHostTabId?: () => number | undefined;
}

export class TerminalHost {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private searchAddon: SearchAddon;
  private executor: ShellExecutor;
  private inputBuffer = '';
  private inputCursor = 0;
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
  private reverseSearchSavedInput = '';
  private shellUser = 'user';
  private hostDomain = 'browser';
  private lastPromptPlain = '';
  private clickContext: ClickableList | null = null;
  private linkRowHover: LinkRowHover;
  private watchTimer: ReturnType<typeof setInterval> | null = null;
  private lastWelcomeAt = 0;
  private editor: TerminalEditor | null = null;
  private keyEngine = new KeySequenceEngine();

  constructor(private options: TerminalHostOptions) {
    registerAllCommands();

    this.terminal = new Terminal({
      theme: getThemePreset('redline').xterm,
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
      getHostTabId: options.getHostTabId,
      onOutput: (stream, text) => {
        appendTranscriptOutput(text);
        this.writeOutput(stream, text);
      },
    });

    this.linkRowHover = new LinkRowHover(this.terminal, () => this.getLinkHoverColor());
  }

  async init(): Promise<void> {
    this.terminal.open(this.options.container);
    this.terminal.options.linkHandler = {
      allowNonHttpProtocols: true,
      activate: (event, uri) => {
        if (uri.startsWith('bs://run/')) {
          const cmd = decodeURIComponent(uri.slice('bs://run/'.length));
          void this.runClickCommand(cmd);
          return;
        }
        if (/^https?:\/\//i.test(uri)) {
          void this.openHttpUrl(uri, event);
        }
      },
    };

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
    bootstrapRuntimeConfig();
    void preloadRuntimeConfig();

    await this.executor.initialize();
    this.cwd = this.executor.getCwd();
    this.history = await getHistory();
    await this.refreshShellUser();
    await this.refreshHostDomain();

    if (!this.config.firstRunComplete) {
      this.writeBanner();
      await saveConfig({ firstRunComplete: true });
    }

    if (!this.options.compact) {
      await this.writeWelcomeBanner();
    }

    this.writePrompt();
    this.terminal.onData((data) => this.handleInput(data));
    this.terminal.attachCustomKeyEventHandler((e) => this.handleKeyEvent(e));
    this.registerClickableListProvider();
    this.registerUrlLinkProvider();
    this.registerTabNavListener();

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.config?.newValue) {
        const next = changes.config.newValue as ShellConfig;
        this.applyConfig(next);
        void this.refreshShellUser();
      }
    });

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'browsershell-focus') {
        void this.writeWelcomeBanner({ redrawPrompt: true });
        this.terminal.focus();
        void this.consumePendingCommand();
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.pendingCommand?.newValue) {
        void this.consumePendingCommand();
      }
    });

    await this.consumePendingCommand();
  }

  private async consumePendingCommand(): Promise<void> {
    if (this.running || this.editor) return;
    const pending = await chrome.storage.local.get('pendingCommand');
    const command = pending.pendingCommand as string | undefined;
    if (!command) return;
    await chrome.storage.local.remove('pendingCommand');
    this.inputBuffer = '';
    this.terminal.write('\r\x1b[K');
    await this.runCommand(command);
    this.cwd = this.executor.getCwd();
    await this.refreshHostDomain();
    await this.refreshShellUser();
    this.writePrompt();
  }

  focus(): void {
    this.terminal.focus();
  }

  private applyConfig(config: ShellConfig): void {
    this.config = config;
    const preset = getThemePreset(config.theme, config.customThemes ?? []);
    const font = FONT_PRESETS.find((f) => f.id === config.fontFamily) ?? FONT_PRESETS[0]!;

    this.terminal.options.theme = preset.xterm;
    this.terminal.options.fontFamily = font.family;
    this.terminal.options.fontSize = config.fontSize;
    this.terminal.options.lineHeight = config.lineHeight;
    this.terminal.options.letterSpacing = config.letterSpacing ?? 0;
    this.terminal.options.cursorBlink = config.cursorBlink;
    this.terminal.options.cursorStyle = config.cursorStyle ?? 'block';
  }

  private writeBanner(): void {
    const banner = [
      color('╔══════════════════════════════════════╗', ANSI.cyan),
      color(`║       BrowserShell v${BUILD_VERSION}           ║`, ANSI.cyan),
      color('╚══════════════════════════════════════╝', ANSI.cyan),
      '',
      heading('Welcome to BrowserShell!'),
      color(`Build ${BUILD_STAMP}`, ANSI.dim),
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
    const preset = getThemePreset(this.config?.theme ?? 'redline');
    return this.config?.promptColor || preset.promptColor;
  }

  private getLinkHoverColor(): string {
    const preset = getThemePreset(this.config?.theme ?? 'redline', this.config?.customThemes ?? []);
    return preset.xterm.selectionBackground ?? '#264f78';
  }

  private setClickContext(context: ClickableList | null): void {
    if (this.clickContext !== context) {
      this.linkRowHover.clear();
    }
    this.clickContext = context;
  }

  private async refreshShellUser(): Promise<void> {
    const raw = this.config?.username || this.config?.env?.USER || 'user';
    this.shellUser = raw.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24) || 'user';
    this.executor.setEnv({ USER: this.shellUser });
  }

  private async writeWelcomeBanner(opts?: { redrawPrompt?: boolean }): Promise<void> {
    if (this.config?.welcomeEnabled === false) return;
    if (sessionStorage.getItem('browsershell-welcome-shown')) return;
    sessionStorage.setItem('browsershell-welcome-shown', '1');
    const now = Date.now();
    if (now - this.lastWelcomeAt < 4000) return;
    this.lastWelcomeAt = now;
    try {
      const snapshot = await fetchWelcomeSnapshot(createChromeAPI());
      const prefix = opts?.redrawPrompt ? '\n' : '';
      this.terminal.write(toTerminalOutput(prefix + formatWelcomeLines(snapshot) + '\n'));
      if (opts?.redrawPrompt) this.writePrompt();
    } catch {
      /* welcome is optional */
    }
  }

  private async refreshHostDomain(): Promise<void> {
    const tabId = this.options.getHostTabId?.();
    if (!tabId) {
      this.hostDomain = 'browser';
      return;
    }
    try {
      const tab = await createChromeAPI().tabs.get(tabId);
      const url = tab?.url ?? '';
      this.hostDomain = url.startsWith('http') ? tabDomain(url) : 'browser';
    } catch {
      this.hostDomain = 'browser';
    }
  }

  private formatPromptText(): string {
    const user = this.shellUser || this.executor.getEnv().USER || 'user';
    const template = this.config?.prompt ?? '\\u@\\h:\\w$ ';
    const promptText = formatPromptTemplate(template, {
      user,
      host: this.hostDomain,
      cwd: this.cwd,
    });
    this.lastPromptPlain = promptText;
    return promptText;
  }

  private formatPromptInline(): string {
    return `\x1b[38;2;${hexToRgb(this.getPromptColor())}m${this.formatPromptText()}\x1b[0m`;
  }

  private formatPrompt(): string {
    return `\n${this.formatPromptInline()}`;
  }

  private writePrompt(): void {
    this.terminal.write(this.formatPrompt());
  }

  private async openHttpUrl(url: string, event: MouseEvent | undefined): Promise<void> {
    const chrome = createChromeAPI();
    const newTab = event?.metaKey || event?.ctrlKey;
    try {
      if (newTab) {
        await chrome.tabs.create({ url, active: true });
      } else {
        const hostTabId = this.options.getHostTabId?.();
        if (hostTabId) {
          await chrome.tabs.update(hostTabId, { url });
        } else {
          await chrome.tabs.create({ url, active: true });
        }
      }
    } catch {
      /* ignore navigation errors */
    }
  }

  private registerUrlLinkProvider(): void {
    this.terminal.registerLinkProvider({
      provideLinks: (bufferLineNumber, callback) => {
        const line = this.terminal.buffer.active.getLine(bufferLineNumber - 1);
        if (!line) return callback(undefined);

        const text = line.translateToString(false);
        const hits = findUrlsInLine(text);
        if (!hits.length) return callback(undefined);

        callback(
          hits.map((hit) => ({
            text: hit.url,
            range: toLinkRange(bufferLineNumber, hit.xStart, hit.xEnd),
            decorations: { pointerCursor: true, underline: true },
            activate: (_e, url) => {
              void this.openHttpUrl(url, _e);
            },
          }))
        );
      },
    });
  }

  private registerClickableListProvider(): void {
    // Fallback for rows without OSC-8 metadata (e.g. piped/plain output).
    this.terminal.registerLinkProvider({
      provideLinks: (bufferLineNumber, callback) => {
        if (!this.clickContext) return callback(undefined);

        const line = this.terminal.buffer.active.getLine(bufferLineNumber - 1);
        if (!line) return callback(undefined);

        const text = line.translateToString(false);
        const hit = matchListRowIndex(text);
        if (!hit || hit.index < 1 || hit.index > this.clickContext.count) {
          return callback(undefined);
        }

        const cmd = this.clickContext.command(hit.index);
        const linkText = text.trimEnd().slice(hit.xStart, hit.xEnd + 1) || String(hit.index);
        callback([
          {
            text: linkText,
            range: toLinkRange(bufferLineNumber, hit.xStart, hit.xEnd),
            decorations: { pointerCursor: true, underline: false },
            hover: () => this.linkRowHover.show(bufferLineNumber),
            leave: () => this.linkRowHover.clear(),
            activate: () => {
              this.linkRowHover.clear();
              void this.runClickCommand(cmd);
            },
          },
        ]);
      },
    });
  }

  private registerTabNavListener(): void {
    const hostTabId = this.options.getHostTabId?.();
    if (!hostTabId) return;
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (tabId === hostTabId && changeInfo.url) {
        void this.refreshHostDomain();
      }
    });
  }

  private applyWatch(result: CommandResult): void {
    if (result.watch === null) {
      this.clearWatchTimer();
      return;
    }
    if (result.watch) {
      this.clearWatchTimer();
      const { intervalMs, command } = result.watch;
      this.watchTimer = setInterval(() => {
        if (this.running) return;
        void this.runWatchTick(command);
      }, intervalMs);
    }
  }

  private clearWatchTimer(): void {
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
    stopWatch();
  }

  private async runWatchTick(command: string): Promise<void> {
    this.terminal.write(toTerminalOutput(`\n[watch] ${stripAnsi(command)}\n`));
    beginTranscriptEntry(this.lastPromptPlain, command);
    this.running = true;
    try {
      const result = await this.executor.execute(command, { silent: false });
      this.setClickContext(result.clickableList ?? null);
      this.applyWatch(result);
    } finally {
      this.running = false;
      endTranscriptEntry();
    }
    this.cwd = this.executor.getCwd();
    await this.refreshHostDomain();
    this.writePrompt();
  }

  private async runClickCommand(command: string): Promise<void> {
    if (this.running) return;
    this.terminal.write(toTerminalOutput(`\n${stripAnsi(command)}\n`));
    beginTranscriptEntry(this.lastPromptPlain, command);
    this.running = true;
    try {
      const result = await this.executor.execute(command);
      this.setClickContext(result.clickableList ?? null);
      this.applyWatch(result);
    } finally {
      this.running = false;
      endTranscriptEntry();
    }
    this.cwd = this.executor.getCwd();
    await this.refreshHostDomain();
    this.writePrompt();
  }

  private handleKeyEvent(e: KeyboardEvent): boolean {
    if (this.editor) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') return true;
      if (e.key === 'Escape') return true;
      return false;
    }

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
      this.inputCursor = 0;
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

    if (this.tryTerminalBinding(e)) return false;
    return true;
  }

  private tryTerminalBinding(e: KeyboardEvent): boolean {
    const runtime = getCachedRuntimeConfig() ?? bootstrapRuntimeConfig();
    const leader = runtime.shell.leader ?? '<space>';

    const stroke = eventToStroke(e, leader);
    if (!stroke) return false;

    const result = this.keyEngine.match(stroke, runtime.sequences, 'terminal');
    if (!result) {
      // Leader is for page/global chords (<leader>e). In the terminal, pass Space through
      // unless the user has explicit terminal binds prefixed with <leader>.
      if (stroke.leader && !scopeUsesLeader(runtime.sequences, 'terminal')) {
        this.keyEngine.reset();
        return false;
      }
      if (stroke.leader) return true;
      return false;
    }

    if (result.action === 'clear') {
      this.terminal.clear();
      this.writePrompt();
    } else if (result.action === 'reverse-search') {
      this.startReverseSearch();
    } else if (result.action === 'edit') {
      void this.runCommand('edit');
    }
    return true;
  }

  private async handleInput(data: string): Promise<void> {
    if (this.running) return;

    if (this.editor) {
      this.editor.handleInput(data);
      return;
    }

    if (this.reverseSearchActive) {
      await this.handleReverseSearchInput(data);
      return;
    }

    const code = data.charCodeAt(0);

    if (code === 13) {
      const command = this.inputBuffer.trim();
      this.terminal.write('\n');
      this.inputBuffer = '';
      this.inputCursor = 0;
      this.historyIndex = -1;
      this.lastCompletions = [];

      if (command) {
        await addHistoryEntry(command);
        this.history = await getHistory();
        beginTranscriptEntry(this.lastPromptPlain, command);
        await this.runCommand(command);
        endTranscriptEntry();
      }

      this.cwd = this.executor.getCwd();
      await this.refreshHostDomain();
      await this.refreshShellUser();
      if (!this.editor) this.writePrompt();
      return;
    }

    if (code === 127 || data === '\x7f') {
      if (this.inputCursor > 0) {
        this.inputBuffer =
          this.inputBuffer.slice(0, this.inputCursor - 1) + this.inputBuffer.slice(this.inputCursor);
        this.inputCursor--;
        this.redrawInputLine();
      }
      return;
    }

    if (data === '\x1b[D') {
      if (this.inputCursor > 0) {
        this.inputCursor--;
        this.terminal.write('\x1b[D');
      }
      return;
    }

    if (data === '\x1b[C') {
      if (this.inputCursor < this.inputBuffer.length) {
        this.inputCursor++;
        this.terminal.write('\x1b[C');
      }
      return;
    }

    if (data === '\x01') {
      this.inputCursor = 0;
      this.redrawInputLine();
      return;
    }

    if (data === '\x05') {
      this.inputCursor = this.inputBuffer.length;
      this.redrawInputLine();
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
      this.inputBuffer =
        this.inputBuffer.slice(0, this.inputCursor) + data + this.inputBuffer.slice(this.inputCursor);
      this.inputCursor += data.length;
      this.redrawInputLine();
    }
  }

  private redrawInputLine(): void {
    this.terminal.write('\r\x1b[K' + this.formatPromptInline() + this.inputBuffer);
    const tail = this.inputBuffer.length - this.inputCursor;
    if (tail > 0) this.terminal.write(`\x1b[${tail}D`);
  }

  private replaceInput(newInput: string): void {
    this.inputBuffer = newInput;
    this.inputCursor = newInput.length;
    this.redrawInputLine();
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
    this.reverseSearchSavedInput = this.inputBuffer;
    this.reverseSearchQuery = '';
    this.reverseSearchMatches = [...this.history].reverse();
    if (!this.reverseSearchMatches.length) this.reverseSearchMatches = [''];
    this.reverseSearchMatchIndex = 0;
    this.redrawReverseSearchLine();
  }

  private cancelReverseSearch(): void {
    this.reverseSearchActive = false;
    this.reverseSearchQuery = '';
    this.inputBuffer = this.reverseSearchSavedInput;
    this.terminal.write('\r\x1b[2K');
    this.terminal.write(this.formatPromptInline() + this.reverseSearchSavedInput);
  }

  private redrawReverseSearchLine(): void {
    const match = this.reverseSearchMatches[this.reverseSearchMatchIndex] ?? '';
    this.inputBuffer = match;
    const prefix = color(`(reverse-i-search)'${this.reverseSearchQuery}': `, ANSI.yellow);
    this.terminal.write('\r\x1b[2K' + prefix + match);
  }

  private async handleReverseSearchInput(data: string): Promise<void> {
    const code = data.charCodeAt(0);

    if (code === 13) {
      this.reverseSearchActive = false;
      this.reverseSearchQuery = '';
      this.terminal.write('\r\x1b[2K');
      this.terminal.write(this.formatPromptInline() + this.inputBuffer);
      return;
    }

    if (data === '\x1b' || code === 127 || data === '\x7f') {
      if (this.reverseSearchQuery.length > 0) {
        this.reverseSearchQuery = this.reverseSearchQuery.slice(0, -1);
        this.updateReverseSearchMatches();
        this.redrawReverseSearchLine();
      } else {
        this.cancelReverseSearch();
      }
      return;
    }

    if (data === '\x12') {
      if (this.reverseSearchMatches.length > 1) {
        this.reverseSearchMatchIndex = (this.reverseSearchMatchIndex + 1) % this.reverseSearchMatches.length;
        this.redrawReverseSearchLine();
      }
      return;
    }

    if (code >= 32 && code !== 127) {
      this.reverseSearchQuery += data;
      this.updateReverseSearchMatches();
      this.reverseSearchMatchIndex = 0;
      this.redrawReverseSearchLine();
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
      this.setClickContext(null);
      return;
    }

    this.running = true;
    try {
      const result = await this.executor.execute(command);
      this.setClickContext(result.clickableList ?? null);
      this.applyWatch(result);

      const editorPayload = (result.structured as { editor?: boolean; path?: string; content?: string } | undefined);
      if (editorPayload?.editor) {
        this.startEditor(editorPayload.path, editorPayload.content ?? '');
      }

      if ((result.structured as { reload?: boolean } | undefined)?.reload) {
        await this.executor.reloadConfig();
        this.config = await loadConfig();
        this.applyConfig(this.config);
      }
    } finally {
      this.running = false;
    }
  }

  private startEditor(path?: string, content = ''): void {
    const runtime = getCachedRuntimeConfig() ?? bootstrapRuntimeConfig();
    this.editor = new TerminalEditor({
      terminal: this.terminal,
      vfs: this.executor.getVfs(),
      cwd: this.cwd,
      filename: path,
      initialContent: content,
      bindings: runtime.sequences.filter((b) => b.scope === 'editor'),
      onExit: () => {
        this.editor = null;
        this.writePrompt();
      },
    });
    this.editor.activate();
  }
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r};${g};${b}`;
}