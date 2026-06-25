import { collectClickables, dedupeNested, type ClickableTarget } from './clickables';
import { assignHintLabels } from './hint-labels';
import { flashMessage, hideHintStatus, hideHud, hintStatusReservedHeight, showHintStatus } from './hud';
import { computeMarkerPosition } from './marker-placement';
import { ensurePageUiRoot } from './styles';

interface HintEntry {
  target: ClickableTarget;
  hint: string;
  marker: HTMLDivElement;
}

const DEFAULT_CHARS = 'asdfghjklqwertyuiopzxcvbnm';

function renderMarkerLabel(hint: string, typed: string): string {
  if (!typed || !hint.startsWith(typed)) return hint;
  const rest = hint.slice(typed.length);
  if (!rest) return `<span class="bs-hint-typed">${hint}</span>`;
  return `<span class="bs-hint-typed">${typed}</span><span class="bs-hint-rest">${rest}</span>`;
}

function activateTarget(target: ClickableTarget, newTab: boolean, copyOnly = false): void {
  const el = target.element;
  el.scrollIntoView({ block: 'nearest', behavior: 'auto' });

  const href = target.href ?? (el instanceof HTMLAnchorElement ? el.href : undefined);
  if (copyOnly && href) {
    void navigator.clipboard.writeText(href).then(
      () => flashMessage('Link URL copied.'),
      () => flashMessage('Could not copy link URL.'),
    );
    return;
  }
  if (newTab && href) {
    window.open(href, '_blank', 'noopener');
    return;
  }

  const rect = el.getBoundingClientRect();
  const x = rect.left + Math.min(rect.width / 2, rect.width - 1);
  const y = rect.top + Math.min(rect.height / 2, rect.height - 1);
  const opts: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 0,
    clientX: x,
    clientY: y,
  };

  try {
    el.focus({ preventScroll: true });
  } catch {
    /* ignore */
  }

  if (typeof el.click === 'function') {
    el.click();
    return;
  }

  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}

export class LinkHints {
  private entries: HintEntry[] = [];
  private container: HTMLDivElement | null = null;
  private typed = '';
  private newTab = false;
  private copyOnly = false;
  private chars = DEFAULT_CHARS;
  private active = false;
  private tabRotate = 0;

  private reposition = () => this.updateMarkerPositions();
  private onClickOutside = (e: MouseEvent) => {
    if (!this.active) return;
    const target = e.target as Node;
    if (target instanceof Element && target.closest('#bs-page-ui-root')) return;
    this.cancel();
  };

  isActive(): boolean {
    return this.active;
  }

  start(opts: { newTab?: boolean; copyOnly?: boolean; hintChars?: string; maxHints?: number } = {}): void {
    this.stop();
    this.newTab = !!opts.newTab;
    this.copyOnly = !!opts.copyOnly;
    this.chars = (opts.hintChars ?? DEFAULT_CHARS).replace(/\s+/g, '') || DEFAULT_CHARS;
    this.typed = '';
    this.tabRotate = 0;

    const max = opts.maxHints ?? 220;
    const targets = dedupeNested(collectClickables(max));
    if (!targets.length) {
      flashMessage('No clickable links found on this page.');
      return;
    }

    const hints = assignHintLabels(targets.length, this.chars);
    const root = ensurePageUiRoot();

    this.container = document.createElement('div');
    this.container.id = 'bs-hint-container';
    root.appendChild(this.container);

    this.entries = targets.map((target, i) => {
      const marker = document.createElement('div');
      marker.className = 'bs-hint-marker';
      marker.innerHTML = renderMarkerLabel(hints[i]!, '');
      this.container!.appendChild(marker);
      return { target, hint: hints[i]!, marker };
    });

    this.active = true;
    this.updateMarkerPositions();
    this.updateVisibility();

    window.addEventListener('scroll', this.reposition, true);
    window.addEventListener('resize', this.reposition, true);
    document.addEventListener('mousedown', this.onClickOutside, true);

    const mode = this.copyOnly ? 'copy URL' : this.newTab ? 'new tab' : 'current tab';
    showHintStatus(
      `<strong>${targets.length} hints</strong> · type to match · mode: <strong>${mode}</strong> · <strong>Tab</strong> rotate · <strong>Esc</strong> cancel`,
    );
  }

  cancel(): void {
    if (!this.active) return;
    this.stop();
    flashMessage('Hints cancelled.');
  }

  stop(): void {
    if (!this.active && !this.entries.length) return;
    this.active = false;
    window.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition, true);
    document.removeEventListener('mousedown', this.onClickOutside, true);

    for (const e of this.entries) {
      e.target.element.classList.remove('bs-hint-target');
      e.marker.remove();
    }
    this.entries = [];
    this.container?.remove();
    this.container = null;
    this.typed = '';
    hideHud();
    hideHintStatus();
  }

  /** Returns true if the event was consumed. */
  onKeyDown(e: KeyboardEvent): boolean {
    if (!this.active) return false;

    if (e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return true;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.cancel();
      return true;
    }

    if (e.key === 'Shift') {
      e.preventDefault();
      e.stopPropagation();
      this.newTab = !this.newTab;
      const mode = this.newTab ? 'new tab' : 'current tab';
      showHintStatus(`<strong>Link hints</strong> — open in <strong>${mode}</strong>`);
      return true;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.typed = this.typed.slice(0, -1);
      this.tabRotate = 0;
      this.updateVisibility();
      return true;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const matches = this.currentMatches();
      if (matches.length > 1) {
        this.tabRotate = (this.tabRotate + (e.shiftKey ? -1 : 1) + matches.length) % matches.length;
        this.highlightRotate(matches);
      }
      return true;
    }

    const ch = e.key.length === 1 ? e.key.toLowerCase() : '';
    if (!ch || !this.chars.includes(ch)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return true;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const openNewTab = this.newTab || e.shiftKey;
    this.typed += ch;
    this.tabRotate = 0;
    const matches = this.currentMatches();

    if (!matches.length) {
      this.typed = this.typed.slice(0, -1);
      flashMessage('No matching hint.', 900);
      this.updateVisibility();
      return true;
    }

    const exact = matches.filter((entry) => entry.hint === this.typed);
    if (exact.length === 1) {
      const pick = exact[0]!;
      this.stop();
      activateTarget(pick.target, openNewTab, this.copyOnly);
      return true;
    }

    if (matches.length === 1) {
      const pick = matches[0]!;
      this.stop();
      activateTarget(pick.target, openNewTab, this.copyOnly);
      return true;
    }

    this.updateVisibility();
    return true;
  }

  private currentMatches(): HintEntry[] {
    return this.entries.filter((entry) => entry.hint.startsWith(this.typed));
  }

  private highlightRotate(matches: HintEntry[]): void {
    for (const e of this.entries) {
      e.marker.classList.remove('bs-hint-active');
      e.target.element.classList.remove('bs-hint-target');
    }
    const pick = matches[this.tabRotate];
    if (!pick) return;
    pick.marker.classList.add('bs-hint-active');
    pick.target.element.classList.add('bs-hint-target');
    showHintStatus(
      `<strong>Tab</strong> — <strong>${pick.hint}</strong> · ${pick.target.label || 'link'}`,
    );
    this.updateMarkerPositions();
  }

  private updateMarkerPositions(): void {
    const reservedBottom = hintStatusReservedHeight() + 12;
    for (const e of this.entries) {
      const rect = e.target.element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        e.marker.style.display = 'none';
        continue;
      }
      const inView =
        rect.bottom >= 0 &&
        rect.top <= window.innerHeight &&
        rect.right >= 0 &&
        rect.left <= window.innerWidth;
      if (!inView && !e.hint.startsWith(this.typed)) {
        e.marker.style.display = 'none';
        continue;
      }
      const pos = computeMarkerPosition(rect, reservedBottom);
      e.marker.style.display = 'flex';
      e.marker.style.left = `${pos.left}px`;
      e.marker.style.top = `${pos.top}px`;
    }
  }

  private updateVisibility(): void {
    const matches = this.currentMatches();
    for (const e of this.entries) {
      const match = e.hint.startsWith(this.typed);
      e.marker.style.display = match ? 'flex' : 'none';
      e.marker.innerHTML = renderMarkerLabel(e.hint, this.typed);
      e.marker.classList.toggle('bs-hint-match', match && this.typed.length > 0);
      e.marker.classList.remove('bs-hint-active');
      e.target.element.classList.toggle('bs-hint-target', match && this.typed.length > 0);
    }
    this.updateMarkerPositions();

    if (this.typed) {
      const suffix = matches.length === 1 ? ' · press to open' : ` · ${matches.length} matches`;
      showHintStatus(`<strong>${this.typed}</strong>${suffix}`);
    } else {
      const mode = this.newTab ? 'new tab' : 'current tab';
      showHintStatus(
        `<strong>${this.entries.length} hints</strong> · type to match · mode: <strong>${mode}</strong>`,
      );
    }
  }
}