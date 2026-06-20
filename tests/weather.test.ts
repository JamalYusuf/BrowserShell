import { describe, expect, it } from 'vitest';
import { parseWeatherResponse } from '@/shared/weather';

describe('parseWeatherResponse', () => {
  it('returns plain text line', () => {
    expect(parseWeatherResponse('London: ☀ +22°C\n')).toBe('London: ☀ +22°C');
  });

  it('extracts weather from wttr.in HTML', () => {
    const html = `<!DOCTYPE html><html><body><div class="term-container">Troutman, North Carolina, US: ☀️  +81°F
    </div></body></html>`;
    expect(parseWeatherResponse(html)).toBe('Troutman, North Carolina, US: ☀️ +81°F');
  });

  it('rejects raw HTML without a weather line', () => {
    expect(parseWeatherResponse('<!DOCTYPE html><html><head></head></html>')).toBeNull();
  });
});