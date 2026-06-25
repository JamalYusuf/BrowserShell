/** Shell history and bang-search expansions. */

import { bangToCommand, parseBangInvocation } from '@/shared/bangs';
import { loadConfig } from '@/shared/storage';

export function expandShellHistory(input: string, lastCommand: string): string {
  const trimmed = input.trim();
  if (trimmed === '!!') return lastCommand;
  if (trimmed.includes('!!') && lastCommand) {
    return trimmed.replace(/!!/g, lastCommand);
  }
  return input;
}

export async function expandBangAsync(input: string): Promise<string> {
  const parsed = parseBangInvocation(input);
  if (!parsed) return input;
  const cfg = await loadConfig();
  const cmd = bangToCommand(parsed.name, parsed.query, cfg.bangs);
  return cmd ?? input;
}

/** Sync expansion using built-in bangs only (for parser hot path). */
export function expandBang(input: string): string {
  const parsed = parseBangInvocation(input);
  if (!parsed) return input;
  const cmd = bangToCommand(parsed.name, parsed.query);
  return cmd ?? input;
}