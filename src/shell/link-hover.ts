import type { IDisposable, Terminal } from '@xterm/xterm';

/** Highlight a full terminal row while hovering a clickable list link. */
export class LinkRowHover {
  private active: IDisposable | undefined;

  constructor(
    private terminal: Terminal,
    private getColor: () => string
  ) {}

  clear(): void {
    this.active?.dispose();
    this.active = undefined;
  }

  show(bufferLineNumber: number): void {
    this.clear();
    const buf = this.terminal.buffer.active;
    const line = bufferLineNumber - 1;
    const marker = this.terminal.registerMarker(-buf.baseY - buf.cursorY + line);
    if (!marker) return;

    const decoration = this.terminal.registerDecoration({
      marker,
      x: 0,
      width: this.terminal.cols,
      height: 1,
      backgroundColor: this.getColor(),
      layer: 'bottom',
    });

    if (!decoration) {
      marker.dispose();
      return;
    }

    this.active = {
      dispose: () => {
        decoration.dispose();
        marker.dispose();
      },
    };
  }
}