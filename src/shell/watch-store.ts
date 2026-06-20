export interface WatchState {
  intervalMs: number;
  command: string;
}

let active: WatchState | null = null;

export function getWatch(): WatchState | null {
  return active;
}

export function startWatch(intervalMs: number, command: string): void {
  active = { intervalMs, command };
}

export function stopWatch(): void {
  active = null;
}