import { color, success, warn, ANSI } from '@/shell/output';

export function emptyListHint(command: string, context?: string): string {
  const ctx = context ? ` for ${context}` : '';
  const tips: Record<string, string> = {
    links: 'Try reload --hard or navigate to a page with links.',
    inputs: 'No form fields visible — try after the page loads.',
    images: 'No images found — scroll down or reload.',
    downloads: 'Nothing downloaded yet — files appear after browser downloads.',
    history: 'Try history today or visit some sites first.',
    extensions: 'Extensions are managed by Chrome — check chrome://extensions.',
    bookmark: 'Try bookmark add or search a broader term.',
    search: 'Try a shorter query or search --tabs only.',
    recent: 'Recently closed tabs appear here after you close tabs.',
  };
  const tip = tips[command] ?? 'Try a different query or reload the page.';
  return warn(`No results${ctx}. ${tip}`);
}

export function listFooter(hint: string): string {
  return `\n${color(hint, ANSI.dim)}`;
}

export function clickableFooter(action: string): string {
  return listFooter(`Hover row to preview · click to run · ${action}`);
}

export function successFooter(text: string): string {
  return `\n${success(text)}`;
}