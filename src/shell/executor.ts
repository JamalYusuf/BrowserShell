import type { ChromeAPI } from '@/chrome/api';
import { loadConfig, saveConfig } from '@/shared/storage';
import type { ASTNode, CommandNode, CommandResult, ExecutionContext } from '@/shared/types';
import { VirtualFileSystem } from '@/vfs';
import { expandBang, expandShellHistory } from './history-expand';
import { expandVariables, parse } from './parser';
import { getRegistry } from './registry';
import { error, stripAnsi, suggestCommand } from './output';

export interface ExecutorOptions {
  chrome: ChromeAPI;
  getCols?: () => number;
  onOutput?: (stream: 'stdout' | 'stderr', text: string) => void;
}

export class ShellExecutor {
  private vfs: VirtualFileSystem;
  private cwd = '/';
  private env: Record<string, string> = {};
  private aliases: Record<string, string> = {};
  private registry = getRegistry();
  private lastExitCode = 0;
  private lastBookmarkSearch: import('@/chrome/api').BookmarkNode[] = [];
  private lastCommand = '';
  private activeWindowId: number | null = null;

  constructor(private options: ExecutorOptions) {
    this.vfs = new VirtualFileSystem(options.chrome);
  }

  async initialize(): Promise<void> {
    const config = await loadConfig();
    this.env = { ...config.env };
    this.aliases = { ...config.aliases };
    await this.runRc(config.rc);
  }

  private async runRc(rc: string): Promise<void> {
    const lines = rc.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    for (const line of lines) {
      if (line.startsWith('alias ')) {
        await this.execute(line, { silent: true });
      } else if (line.startsWith('export ')) {
        await this.execute(line, { silent: true });
      }
    }
  }

  getCwd(): string {
    return this.cwd;
  }

  getEnv(): Record<string, string> {
    return { ...this.env };
  }

  getAliases(): Record<string, string> {
    return { ...this.aliases };
  }

  getLastExitCode(): number {
    return this.lastExitCode;
  }

  getVfs(): VirtualFileSystem {
    return this.vfs;
  }

  private createContext(stdin = '', piped = false): ExecutionContext {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    return {
      vfs: this.vfs,
      chrome: this.options.chrome,
      env: this.env,
      cwd: this.cwd,
      aliases: this.aliases,
      stdin,
      piped,
      cols: this.options.getCols?.() ?? 80,
      writeStdout: (s) => {
        stdoutChunks.push(s);
        this.options.onOutput?.('stdout', s);
      },
      writeStderr: (s) => {
        stderrChunks.push(s);
        this.options.onOutput?.('stderr', s);
      },
      setCwd: (path) => {
        this.cwd = path;
      },
      setEnv: (key, value) => {
        this.env[key] = value;
        saveConfig({ env: this.env });
      },
      setAlias: (name, value) => {
        this.aliases[name] = value;
        saveConfig({ aliases: this.aliases });
      },
      getBookmarkSearchResults: () => this.lastBookmarkSearch,
      setBookmarkSearchResults: (results) => {
        this.lastBookmarkSearch = results;
      },
      getActiveWindowId: async () => {
        if (this.activeWindowId !== null) return this.activeWindowId;
        const tabs = await this.options.chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0]?.windowId ?? 0;
      },
      setActiveWindowId: (id) => {
        this.activeWindowId = id;
      },
    };
  }

  private resolveAlias(name: string): { name: string; args: string[] } {
    if (this.aliases[name]) {
      const parts = this.aliases[name].split(/\s+/);
      return { name: parts[0]!, args: parts.slice(1) };
    }
    return { name, args: [] };
  }

  async execute(input: string, opts?: { silent?: boolean }): Promise<CommandResult> {
    let trimmed = input.trim();
    if (!trimmed) return { stdout: '', exitCode: 0 };

    trimmed = expandShellHistory(trimmed, this.lastCommand);
    trimmed = expandBang(trimmed);
    const expanded = expandVariables(trimmed, this.env);
    const ast = parse(expanded, this.env);
    const result = await this.executeAST(ast, opts);
    this.lastExitCode = result.exitCode;
    if (!opts?.silent && trimmed) this.lastCommand = trimmed;
    return result;
  }

  private async executeAST(node: ASTNode, opts?: { silent?: boolean }): Promise<CommandResult> {
    if (node.type === 'and') {
      const left = await this.executeAST(node.left, opts);
      if (left.exitCode !== 0) return left;
      return this.executeAST(node.right, opts);
    }

    if (node.type === 'sequence') {
      let last: CommandResult = { stdout: '', exitCode: 0 };
      for (const cmd of node.commands) {
        last = await this.executeAST(cmd, opts);
      }
      return last;
    }

    return this.executePipeline(node.commands, opts);
  }

  private async executePipeline(commands: CommandNode[], opts?: { silent?: boolean }): Promise<CommandResult> {
    let stdin = '';
    let lastResult: CommandResult = { stdout: '', exitCode: 0 };

    for (let i = 0; i < commands.length; i++) {
      const cmdNode = commands[i]!;
      const isLast = i === commands.length - 1;
      const resolved = this.resolveAlias(cmdNode.name);
      const fullArgs = [...resolved.args, ...cmdNode.args];
      const cmd = this.registry.resolve(resolved.name);

      if (!cmd) {
        const suggestion = suggestCommand(resolved.name, this.registry.getNames());
        const msg = suggestion
          ? `Command not found: ${resolved.name}. ${suggestion}`
          : `Command not found: ${resolved.name}. Type 'help' for available commands.`;
        if (!opts?.silent) this.options.onOutput?.('stderr', error(msg) + '\n');
        return { stdout: '', stderr: msg, exitCode: 127 };
      }

      if (fullArgs.includes('--help') || fullArgs.includes('-h')) {
        const help = formatCommandHelp(cmd);
        if (!opts?.silent) this.options.onOutput?.('stdout', help + '\n');
        return { stdout: help, exitCode: 0 };
      }

      const context = this.createContext(stdin, !isLast);
      try {
        lastResult = await cmd.handler(fullArgs, context);

        if (lastResult.stderr && !opts?.silent) {
          this.options.onOutput?.('stderr', lastResult.stderr + '\n');
        }

        if (lastResult.exitCode !== 0) return lastResult;

        if (!isLast) {
          // Pipe plain text to the next stage; intermediate stdout stays off-screen.
          stdin = stripAnsi(lastResult.stdout ?? '');
          continue;
        }

        if (lastResult.stdout && !opts?.silent) {
          this.options.onOutput?.('stdout', lastResult.stdout + (lastResult.stdout.endsWith('\n') ? '' : '\n'));
        }

        // Run sourced script lines
        if (resolved.name === 'source') {
          const lines = (lastResult.structured as { commands?: string[] } | undefined)?.commands;
          if (lines?.length) {
            for (const line of lines) {
              const r = await this.execute(line, opts);
              if (r.exitCode !== 0) return r;
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!opts?.silent) this.options.onOutput?.('stderr', error(msg) + '\n');
        return { stdout: '', stderr: msg, exitCode: 1 };
      }
    }

    return lastResult;
  }
}

export function formatCommandHelp(cmd: import('@/shared/types').Command): string {
  const lines = [
    `${cmd.name} — ${cmd.description}`,
    '',
    `Usage: ${cmd.usage}`,
    '',
    'Examples:',
    ...cmd.examples.map((e) => `  ${e}`),
  ];
  if (cmd.seeAlso?.length) {
    lines.push('', `See also: ${cmd.seeAlso.join(', ')}`);
  }
  if (cmd.notes) lines.push('', `Notes: ${cmd.notes}`);
  return lines.join('\n');
}