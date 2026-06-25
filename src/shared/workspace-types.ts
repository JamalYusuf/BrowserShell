/** Saved workspace layout — windows, tabs, and shell state. */

export interface WorkspaceTab {
  url: string;
  active?: boolean;
  pinned?: boolean;
  groupId?: number;
}

export interface WorkspaceWindow {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  state?: 'normal' | 'maximized' | 'fullscreen';
  tabs: WorkspaceTab[];
  activeTabIndex?: number;
}

export interface WorkspaceSnapshot {
  name: string;
  savedAt: number;
  windows: WorkspaceWindow[];
  aliases?: Record<string, string>;
  env?: Record<string, string>;
  cwd?: string;
}