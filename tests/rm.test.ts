import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotesProvider } from '@/vfs/providers/notes';

vi.mock('@/shared/storage', () => ({
  loadConfig: vi.fn(async () => ({
    env: { 'NOTE_draft.md': 'hello', USER: 'test' },
    rc: '',
    theme: 'redline',
    username: 'user',
    welcomeEnabled: true,
    customThemes: [],
    prompt: '',
    hotkey: '',
    firstRunComplete: true,
    aliases: {},
    history: [],
    toggleKey: '`',
    overlayEnabled: true,
    overlayHeight: 100,
    overlayOpacity: 0.88,
    backdropBlur: 6,
    backdropDim: 0.25,
    fontSize: 13,
    fontFamily: 'jetbrains',
    promptColor: '',
    cursorBlink: true,
    cursorStyle: 'block' as const,
    lineHeight: 1.3,
    letterSpacing: 0,
  })),
  saveConfig: vi.fn(async () => {}),
}));

describe('rm command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes a note via vfs unlink', async () => {
    const notes = new NotesProvider();
    await notes.unlink('/notes/draft.md');
    const { saveConfig } = await import('@/shared/storage');
    expect(saveConfig).toHaveBeenCalled();
  });
});