import { getRegistry } from '@/shell/registry';
import { commandManifest } from './manifest';

export function registerAllCommands(): void {
  getRegistry().registerAll(commandManifest);
}

export { commandManifest } from './manifest';