import type { Command, ExecutionContext } from '@/shared/types';

export class CommandRegistry {
  private commands = new Map<string, Command>();
  private aliasMap = new Map<string, string>();

  register(command: Command): void {
    this.commands.set(command.name, command);
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliasMap.set(alias, command.name);
      }
    }
  }

  registerAll(commands: Command[]): void {
    for (const cmd of commands) this.register(cmd);
  }

  resolve(name: string): Command | undefined {
    const resolved = this.aliasMap.get(name) ?? name;
    return this.commands.get(resolved);
  }

  getAll(): Command[] {
    return [...this.commands.values()];
  }

  getNames(): string[] {
    const names = new Set<string>();
    for (const cmd of this.commands.values()) {
      names.add(cmd.name);
      cmd.aliases?.forEach((a) => names.add(a));
    }
    return [...names].sort();
  }

  search(keyword: string): Command[] {
    const lower = keyword.toLowerCase();
    return this.getAll().filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lower) ||
        cmd.description.toLowerCase().includes(lower) ||
        cmd.examples.some((e) => e.toLowerCase().includes(lower))
    );
  }

  async getCompletions(partial: string, context: ExecutionContext): Promise<string[]> {
    const parts = partial.trim().split(/\s+/);
    if (parts.length <= 1) {
      const prefix = parts[0]?.toLowerCase() ?? '';
      return this.getNames().filter((n) => n.toLowerCase().startsWith(prefix));
    }

    const cmdName = parts[0]!;
    const cmd = this.resolve(cmdName);
    if (!cmd?.getCompletions) return [];

    const argPartial = parts[parts.length - 1] ?? '';
    return cmd.getCompletions(argPartial, context);
  }
}

let globalRegistry: CommandRegistry | null = null;

export function getRegistry(): CommandRegistry {
  if (!globalRegistry) globalRegistry = new CommandRegistry();
  return globalRegistry;
}

export function setRegistry(registry: CommandRegistry): void {
  globalRegistry = registry;
}