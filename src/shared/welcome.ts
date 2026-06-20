import type { ChromeAPI } from '@/chrome/api';
import { ANSI, color } from '@/shell/output';
import { BUILD_VERSION } from '@/shared/build-info';
import { parseWeatherResponse } from '@/shared/weather';

export interface WelcomeSnapshot {
  time: string;
  tabCount: number;
  windowCount: number;
  weather?: string;
}

export async function fetchWelcomeSnapshot(chrome: ChromeAPI): Promise<WelcomeSnapshot> {
  const now = new Date();
  const time = now.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const [tabs, windows] = await Promise.all([
    chrome.tabs.query({}),
    chrome.windows.query({}),
  ]);

  let weather: string | undefined;
  try {
    const runtime = (globalThis as { chrome?: { runtime?: { sendMessage: (msg: unknown) => Promise<unknown> } } })
      .chrome?.runtime;
    if (runtime?.sendMessage) {
      const res = (await runtime.sendMessage({ type: 'welcome-weather' })) as
        | { weather?: string | null }
        | undefined;
      if (res?.weather) weather = parseWeatherResponse(res.weather) ?? undefined;
    }
  } catch {
    /* optional */
  }

  return {
    time,
    tabCount: tabs.length,
    windowCount: windows.length,
    weather,
  };
}

export function formatWelcomeLines(snapshot: WelcomeSnapshot): string {
  const lines = [
    color(`BrowserShell v${BUILD_VERSION}`, ANSI.bold) +
      color(` · ${snapshot.time}`, ANSI.dim),
    color(
      `${snapshot.tabCount} tab${snapshot.tabCount === 1 ? '' : 's'} · ${snapshot.windowCount} window${snapshot.windowCount === 1 ? '' : 's'}`,
      ANSI.dim
    ),
  ];

  if (snapshot.weather) {
    lines.push(color(snapshot.weather, ANSI.cyan));
  }

  lines.push(color('`help` · `quick` · `options` · `man intro`', ANSI.dim));
  return lines.join('\n');
}