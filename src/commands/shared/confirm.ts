import type { CommandResult } from '@/shared/types';
import { hasFlag } from './args';
import { warn } from '@/shell/output';

export function isDryRun(args: string[]): boolean {
  return hasFlag(args, '--dry-run', '-n');
}

export function needsForce(args: string[]): boolean {
  return hasFlag(args, '-f', '--force');
}

export function dryRunResult(action: string, detail: string, confirmCmd: string): CommandResult {
  return {
    stdout: warn(`[dry-run] Would ${action}:\n  ${detail}\nConfirm: ${confirmCmd}`),
    exitCode: 0,
  };
}

export function forceRequiredResult(confirmCmd: string, preview?: string): CommandResult {
  const lines = preview ? [`${preview}`, `Confirm: ${confirmCmd}`] : [`Confirm: ${confirmCmd}`];
  return { stderr: warn(lines.join('\n')), exitCode: 1 };
}