/** Resolve Chrome profile display name for shell prompts. */

function sanitizeUsername(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24);
  return cleaned || 'user';
}

export async function resolveChromeUsername(): Promise<string> {
  try {
    if (typeof chrome === 'undefined' || !chrome.identity?.getProfileUserInfo) {
      return 'user';
    }

    const info = await chrome.identity.getProfileUserInfo();
    if (info.email) {
      const local = info.email.split('@')[0] ?? '';
      return sanitizeUsername(local);
    }
  } catch {
    /* guest profile or identity unavailable */
  }
  return 'user';
}