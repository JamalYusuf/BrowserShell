/** Shared argument parsing for commands. */

const FLAG_NO_VALUE = new Set([
  '--json', '--raw', '--help', '-h', '-f', '--force', '-i', '-v', '-1', '-l', '-w', '-c', '-n',
  '--grep', '--next', '--prev', '--copy', '--hard', '--all', '--history', '--dry-run', '--new', '--md', '--markdown',
]);
const FLAG_WITH_VALUE = new Set(['--limit', '--length']);

export function hasFlag(args: string[], ...flags: string[]): boolean {
  return flags.some((f) => args.includes(f));
}

export function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

export function filterFlags(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (FLAG_NO_VALUE.has(arg)) continue;
    if (FLAG_WITH_VALUE.has(arg)) {
      i++;
      continue;
    }
    if (arg.startsWith('--')) {
      i++;
      continue;
    }
    result.push(arg);
  }
  return result;
}