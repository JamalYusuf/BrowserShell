/**
 * Core type definitions for BrowserShell.
 *
 * Commands, execution context, VFS entries, and shell configuration types
 * used across the extension.
 */

export type CommandCategory =
  | 'builtin'
  | 'navigation'
  | 'tabs'
  | 'bookmarks'
  | 'history'
  | 'ai'
  | 'utility'
  | 'process'
  | 'config'
  | 'workspace'
  | 'page';

export interface ClickableList {
  count: number;
  command: (index: number) => string;
}

export interface CommandResult {
  stdout?: string;
  stderr?: string;
  exitCode: number;
  structured?: unknown;
  /** Enables click-to-run on numbered list rows in terminal output */
  clickableList?: ClickableList;
  /** Start, update, or stop a watch interval (null = stop) */
  watch?: { intervalMs: number; command: string } | null;
}

export function ok(stdout = '', exitCode = 0, structured?: unknown): CommandResult {
  return { stdout, exitCode, structured };
}

export function fail(stderr: string, exitCode = 1): CommandResult {
  return { stdout: '', stderr, exitCode };
}

export interface OutputWriter {
  write: (s: string) => void;
}

export interface ExecutionContext {
  vfs: import('@/vfs').VirtualFileSystem;
  chrome: import('@/chrome/api').ChromeAPI;
  env: Record<string, string>;
  cwd: string;
  aliases: Record<string, string>;
  stdin: string;
  /** True when this command feeds another via pipe */
  piped: boolean;
  /** Terminal width in columns — used for width-aware output formatting */
  cols: number;
  writeStdout: (s: string) => void;
  writeStderr: (s: string) => void;
  setCwd: (path: string) => void;
  setEnv: (key: string, value: string) => void;
  setAlias: (name: string, value: string) => void;
  /** Last bookmark search results — enables `bookmark open <#>` by rank */
  getBookmarkSearchResults?: () => import('@/chrome/api').BookmarkNode[];
  setBookmarkSearchResults?: (results: import('@/chrome/api').BookmarkNode[]) => void;
  /** Last links listing — enables `link <#>` after `links` */
  getLastLinksResults?: () => { text: string; href: string }[];
  setLastLinksResults?: (results: { text: string; href: string }[]) => void;
  /** Last inputs listing — enables `input <#>` after `inputs` */
  getLastInputsResults?: () => { label: string; type: string; name: string; placeholder: string }[];
  setLastInputsResults?: (results: { label: string; type: string; name: string; placeholder: string }[]) => void;
  /** Last images listing — enables `image <#>` after `images` */
  getLastImagesResults?: () => { alt: string; src: string; width: number; height: number }[];
  setLastImagesResults?: (results: { alt: string; src: string; width: number; height: number }[]) => void;
  /** Last history listing — enables `history delete <#>` by rank */
  getLastHistoryResults?: () => import('@/chrome/api').HistoryItem[];
  setLastHistoryResults?: (results: import('@/chrome/api').HistoryItem[]) => void;
  /** Last downloads listing — enables `downloads open <#>` by rank */
  getLastDownloadResults?: () => import('@/chrome/api').DownloadInfo[];
  setLastDownloadResults?: (results: import('@/chrome/api').DownloadInfo[]) => void;
  /** Last extensions listing — enables `extensions enable <#>` by rank */
  getLastExtensionResults?: () => import('@/chrome/api').ExtensionInfo[];
  setLastExtensionResults?: (results: import('@/chrome/api').ExtensionInfo[]) => void;
  /** Host page tab when shell runs in overlay iframe */
  getHostTabId?: () => number | undefined;
  /** Shell window context — tabs/tab commands target this window */
  getActiveWindowId?: () => Promise<number>;
  setActiveWindowId?: (id: number | null) => void;
}

/** A registered shell command with metadata for help, man pages, and completion. */
export interface Command {
  /** Primary command name (e.g. `tabs`) */
  name: string;
  /** One-line description shown in help output */
  description: string;
  /** Usage string with placeholders (e.g. `tab switch <n>`) */
  usage: string;
  /** Example invocations for help/man */
  examples: string[];
  category: CommandCategory;
  /** Related commands for cross-reference in man pages */
  seeAlso?: string[];
  notes?: string;
  aliases?: string[];
  /** Command implementation */
  handler: (args: string[], context: ExecutionContext) => Promise<CommandResult>;
  /** Optional tab-completion provider */
  getCompletions?: (partial: string, context: ExecutionContext) => Promise<string[]>;
}

export interface VFSEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size?: number;
  modified?: number;
  meta?: Record<string, unknown>;
}

export interface VFSStat {
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size?: number;
  modified?: number;
  meta?: Record<string, unknown>;
}

export interface VFSProvider {
  name: string;
  mountPoint: string;
  readdir(path: string): Promise<VFSEntry[]>;
  read(path: string, options?: { raw?: boolean }): Promise<string | Uint8Array>;
  stat(path: string): Promise<VFSStat>;
  exists(path: string): Promise<boolean>;
}

export interface CustomThemeColors {
  background: string;
  foreground: string;
  cursor: string;
  promptColor: string;
  accentColor: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  colors: CustomThemeColors;
}

export interface ForgetPreset {
  scope?: 'cookies' | 'cache' | 'storage' | 'data' | 'all';
  includeHistory?: boolean;
}

export interface ShellConfig {
  theme: string;
  /** Prompt username — shown as \\u in PS1 */
  username: string;
  /** Show time/tabs/weather banner when the terminal opens */
  welcomeEnabled: boolean;
  /** User-created terminal color schemes */
  customThemes: CustomTheme[];
  /** Named forget profiles — use `forget preset <name>` */
  forgetPresets?: Record<string, ForgetPreset>;
  prompt: string;
  hotkey: string;
  firstRunComplete: boolean;
  aliases: Record<string, string>;
  env: Record<string, string>;
  history: string[];
  rc: string;
  /** Quake-style overlay toggle key */
  toggleKey: string;
  overlayEnabled: boolean;
  overlayHeight: number;
  overlayOpacity: number;
  backdropBlur: number;
  backdropDim: number;
  fontSize: number;
  fontFamily: string;
  promptColor: string;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  lineHeight: number;
  letterSpacing: number;
  /** Leader key for multi-key bindings (default <space>) */
  leader?: string;
  /** Enable Vimium-style global hotkeys on pages */
  globalHotkeys?: boolean;
  /** Host patterns where global hotkeys are disabled */
  globalHotkeysExceptions?: string[];
  /** Auto-disable global hotkeys when form fields are focused */
  insertModeAuto?: boolean;
  /** Editor mode: vim | emacs | nano */
  editorMode?: string;
  /** User-defined bang shortcuts */
  bangs?: Record<string, { url: string; description?: string }>;
  /** Saved workspace definitions */
  workspaces?: Record<string, import('./workspace-types').WorkspaceSnapshot>;
  /** Parsed keybindings from rc (persisted for options page) */
  keybindings?: { keys: string; action: string; scope: string }[];
  /** Tracks default-rc migrations */
  rcVersion?: number;
}

export interface ManPage {
  name: string;
  title: string;
  sections: { heading: string; content: string }[];
}

export type ASTNode =
  | { type: 'pipeline'; commands: CommandNode[] }
  | { type: 'and'; left: ASTNode; right: ASTNode }
  | { type: 'sequence'; commands: ASTNode[] };

export interface CommandNode {
  name: string;
  args: string[];
  redirect?: { path: string; append: boolean };
}

export interface Token {
  type: 'word' | 'pipe' | 'and' | 'semicolon' | 'redirect';
  value: string;
}