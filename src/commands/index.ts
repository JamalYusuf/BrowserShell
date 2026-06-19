import { getRegistry } from '@/shell/registry';
import { createAICommands } from './ai';
import { createBuiltinCommands } from './builtins';
import { createBrowserCommands } from './browser';
import { createQuickCommands } from './quick';
import { createWindowCommands } from './windows';

export function registerAllCommands(): void {
  const registry = getRegistry();
  registry.registerAll([
    ...createBuiltinCommands(),
    ...createBrowserCommands(),
    ...createWindowCommands(),
    ...createQuickCommands(),
    ...createAICommands(),
  ]);
}

export { createBuiltinCommands, createBrowserCommands, createWindowCommands, createQuickCommands, createAICommands };