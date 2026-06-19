/** Core type definitions for BrowserShell. */

export type CommandCategory =
  | 'builtin'
  | 'navigation'
  | 'tabs'
  | 'bookmarks'
  | 'history'
  | 'ai'
  | 'utility';

export interface CommandResult {
  stdout?: string;
  stderr?: string;
  exitCode: number;
  structured?: unknown;
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
  /** Shell window context — tabs/tab commands target this window */
  getActiveWindowId?: () => Promise<number>;
  setActiveWindowId?: (id: number | null) => void;
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  category: CommandCategory;
  seeAlso?: string[];
  notes?: string;
  aliases?: string[];
  handler: (args: string[], context: ExecutionContext) => Promise<CommandResult>;
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

export type DisplayMode = 'overlay' | 'sidepanel' | 'both';

export interface ShellConfig {
  theme: string;
  prompt: string;
  hotkey: string;
  firstRunComplete: boolean;
  aliases: Record<string, string>;
  env: Record<string, string>;
  history: string[];
  rc: string;
  /** Quake-style overlay toggle key */
  toggleKey: string;
  displayMode: DisplayMode;
  overlayEnabled: boolean;
  overlayHeight: number;
  overlayOpacity: number;
  backdropBlur: number;
  backdropDim: number;
  fontSize: number;
  fontFamily: string;
  promptColor: string;
  cursorBlink: boolean;
  lineHeight: number;
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
  redirects?: { stdin?: string };
}

export interface Token {
  type: 'word' | 'pipe' | 'and' | 'semicolon' | 'redirect';
  value: string;
}