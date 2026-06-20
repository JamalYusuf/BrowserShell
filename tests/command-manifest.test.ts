import { describe, expect, it } from 'vitest';
import { commandManifest } from '@/commands';
import { registerAllCommands } from '@/commands';
import { getRegistry } from '@/shell/registry';
import { EXPECTED_COMMAND_COUNT, EXPECTED_COMMAND_NAMES } from './fixtures/expected-commands';

describe('command manifest', () => {
  it('has exactly the expected number of commands', () => {
    expect(commandManifest.length).toBe(EXPECTED_COMMAND_COUNT);
  });

  it('has no duplicate command names', () => {
    const names = commandManifest.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('includes every expected command and no extras', () => {
    const names = commandManifest.map((c) => c.name).sort();
    const expected = [...EXPECTED_COMMAND_NAMES].sort();
    expect(names).toEqual(expected);
  });

  it('every command has required metadata', () => {
    for (const cmd of commandManifest) {
      expect(cmd.name.trim()).toBeTruthy();
      expect(cmd.usage.trim()).toBeTruthy();
      expect(cmd.description.trim()).toBeTruthy();
      expect(cmd.examples.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('matches registry after registration', () => {
    registerAllCommands();
    const registryNames = getRegistry().getNames().sort();
    const manifestNames = commandManifest
      .flatMap((c) => [c.name, ...(c.aliases ?? [])])
      .sort();
    expect(registryNames).toEqual(manifestNames);
  });
});