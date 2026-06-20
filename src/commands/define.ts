import type { Command } from '@/shared/types';

/** Validate and return a command definition. Use for every exported command. */
export function defineCommand(cmd: Command): Command {
  if (!cmd.name?.trim()) throw new Error('Command missing name');
  if (!cmd.usage?.trim()) throw new Error(`${cmd.name}: missing usage`);
  if (!cmd.description?.trim()) throw new Error(`${cmd.name}: missing description`);
  if (!cmd.examples?.length) throw new Error(`${cmd.name}: needs at least one example`);
  return cmd;
}