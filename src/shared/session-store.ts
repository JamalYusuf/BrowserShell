/** Persisted window/tab layouts for session save/restore. */

export interface SavedTab {
  url: string;
  pinned?: boolean;
  active?: boolean;
}

export interface SavedWindow {
  tabs: SavedTab[];
}

export interface SavedSession {
  name: string;
  savedAt: number;
  windows: SavedWindow[];
}

const STORAGE_KEY = 'bs_saved_sessions';

export async function listSavedSessions(): Promise<SavedSession[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const map = (result[STORAGE_KEY] as Record<string, SavedSession> | undefined) ?? {};
  return Object.values(map).sort((a, b) => b.savedAt - a.savedAt);
}

export async function getSavedSession(name: string): Promise<SavedSession | undefined> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const map = (result[STORAGE_KEY] as Record<string, SavedSession> | undefined) ?? {};
  return map[name];
}

export async function putSavedSession(session: SavedSession): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const map = { ...((result[STORAGE_KEY] as Record<string, SavedSession> | undefined) ?? {}) };
  map[session.name] = session;
  await chrome.storage.local.set({ [STORAGE_KEY]: map });
}

export async function removeSavedSession(name: string): Promise<boolean> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const map = { ...((result[STORAGE_KEY] as Record<string, SavedSession> | undefined) ?? {}) };
  if (!map[name]) return false;
  delete map[name];
  await chrome.storage.local.set({ [STORAGE_KEY]: map });
  return true;
}