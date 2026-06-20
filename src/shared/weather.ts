/** Parse wttr.in responses — plain text or HTML fallback. */

export function parseWeatherResponse(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  if (!/<html/i.test(text) && !/<!DOCTYPE/i.test(text)) {
    const line = text.split('\n').map((l) => l.trim()).find(Boolean);
    return line && line.length < 120 ? line : null;
  }

  const container = text.match(/<div class="term-container"[^>]*>([\s\S]*?)<\/div>/i);
  if (container?.[1]) {
    const line = container[1].replace(/\s+/g, ' ').trim();
    return line && line.length < 120 ? line : null;
  }

  return null;
}

export async function fetchWeatherLine(): Promise<string | null> {
  try {
    const res = await fetch('https://wttr.in/?format=3', {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'curl',
        Accept: 'text/plain',
      },
    });
    if (!res.ok) return null;
    return parseWeatherResponse(await res.text());
  } catch {
    return null;
  }
}