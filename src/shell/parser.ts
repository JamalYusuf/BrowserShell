import type { ASTNode, CommandNode, Token } from '@/shared/types';

/** Simple shell tokenizer and parser (MVP subset). */

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i]!;

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '|') {
      tokens.push({ type: 'pipe', value: '|' });
      i++;
      continue;
    }

    if (ch === ';') {
      tokens.push({ type: 'semicolon', value: ';' });
      i++;
      continue;
    }

    if (ch === '&' && input[i + 1] === '&') {
      tokens.push({ type: 'and', value: '&&' });
      i += 2;
      continue;
    }

    // Quoted strings
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let value = '';
      i++;
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && quote === '"') {
          i++;
          if (i < input.length) value += input[i];
        } else {
          value += input[i];
        }
        i++;
      }
      i++; // closing quote
      tokens.push({ type: 'word', value });
      continue;
    }

    // Words
    let value = '';
    while (i < input.length && !/\s/.test(input[i]!) && !'|;'.includes(input[i]!) && !(input[i] === '&' && input[i + 1] === '&')) {
      if (input[i] === '\\') {
        i++;
        if (i < input.length) value += input[i];
      } else {
        value += input[i];
      }
      i++;
    }
    if (value) tokens.push({ type: 'word', value });
  }

  return tokens;
}

export function expandVariables(input: string, env: Record<string, string>): string {
  return input.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, braced, simple) => {
    const key = braced || simple;
    return env[key] ?? '';
  });
}

function tokensToCommands(tokens: Token[]): CommandNode[] {
  const commands: CommandNode[] = [];
  let current: string[] = [];

  for (const token of tokens) {
    if (token.type === 'pipe') {
      if (current.length) {
        commands.push({ name: current[0]!, args: current.slice(1) });
        current = [];
      }
    } else if (token.type === 'word') {
      current.push(token.value);
    }
  }

  if (current.length) {
    commands.push({ name: current[0]!, args: current.slice(1) });
  }

  return commands;
}

export function parse(input: string, env: Record<string, string> = {}): ASTNode {
  const trimmed = input.trim();
  if (!trimmed) return { type: 'sequence', commands: [] };

  const expanded = expandVariables(trimmed, env);

  // Handle && and ;
  if (expanded.includes('&&')) {
    const parts = expanded.split('&&').map((p) => p.trim());
    let node: ASTNode = parse(parts[0]!, env);
    for (let i = 1; i < parts.length; i++) {
      node = { type: 'and', left: node, right: parse(parts[i]!, env) };
    }
    return node;
  }

  if (expanded.includes(';')) {
    const parts = expanded.split(';').map((p) => p.trim()).filter(Boolean);
    return {
      type: 'sequence',
      commands: parts.map((p) => parse(p, env)),
    };
  }

  const tokens = tokenize(expanded);
  const commands = tokensToCommands(tokens);

  if (commands.length === 1) {
    return { type: 'pipeline', commands };
  }

  return { type: 'pipeline', commands };
}

export function parseLine(input: string, env: Record<string, string> = {}): CommandNode[] {
  const ast = parse(input, env);
  return flattenToPipeline(ast);
}

function flattenToPipeline(node: ASTNode): CommandNode[] {
  if (node.type === 'pipeline') return node.commands;
  if (node.type === 'and') return [...flattenToPipeline(node.left), ...flattenToPipeline(node.right)];
  if (node.type === 'sequence') return node.commands.flatMap(flattenToPipeline);
  return [];
}