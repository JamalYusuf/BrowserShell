/** Vimium-style numeric count prefix (e.g. 5t opens 5 tabs). */

const COUNT_TIMEOUT_MS = 800;

export class CountPrefix {
  private value = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  reset(): void {
    this.value = 0;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Returns true if the key was consumed as a count digit. */
  feedDigit(key: string): boolean {
    if (!/^[0-9]$/.test(key)) return false;
    const d = Number(key);
    this.value = this.value * 10 + d;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reset(), COUNT_TIMEOUT_MS);
    return true;
  }

  /** Active count (0 means no prefix yet — callers treat as 1). */
  get active(): number {
    return this.value;
  }

  hasPrefix(): boolean {
    return this.value > 0;
  }

  /** Read count for next command; resets prefix. Minimum 1. */
  consume(): number {
    const n = this.value > 0 ? this.value : 1;
    this.reset();
    return n;
  }

  /** Peek without consuming. */
  peek(): number {
    return this.value > 0 ? this.value : 1;
  }
}