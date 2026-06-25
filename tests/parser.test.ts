import { describe, expect, it } from 'vitest';
import { expandVariables, parse, tokenize } from '@/shell/parser';

describe('tokenizer', () => {
  it('tokenizes simple commands', () => {
    const tokens = tokenize('ls /tabs');
    expect(tokens).toEqual([
      { type: 'word', value: 'ls' },
      { type: 'word', value: '/tabs' },
    ]);
  });

  it('tokenizes pipes', () => {
    const tokens = tokenize('ls /tabs | grep youtube');
    expect(tokens.filter((t) => t.type === 'pipe')).toHaveLength(1);
  });

  it('tokenizes quoted strings', () => {
    const tokens = tokenize('echo "hello world"');
    expect(tokens[1]).toEqual({ type: 'word', value: 'hello world' });
  });
});

describe('variable expansion', () => {
  it('expands $VAR and ${VAR}', () => {
    expect(expandVariables('echo $HOME', { HOME: '/test' })).toBe('echo /test');
    expect(expandVariables('echo ${USER}', { USER: 'browser' })).toBe('echo browser');
  });
});

describe('parser', () => {
  it('parses pipelines', () => {
    const ast = parse('ls /tabs | grep test');
    expect(ast.type).toBe('pipeline');
    if (ast.type === 'pipeline') {
      expect(ast.commands).toHaveLength(2);
      expect(ast.commands[0]!.name).toBe('ls');
      expect(ast.commands[1]!.name).toBe('grep');
    }
  });

  it('parses && chains', () => {
    const ast = parse('cd /tabs && ls');
    expect(ast.type).toBe('and');
  });

  it('parses semicolon sequences', () => {
    const ast = parse('echo a; echo b');
    expect(ast.type).toBe('sequence');
  });

  it('parses output redirection', () => {
    const ast = parse('echo hello > /notes/out.txt');
    expect(ast.type).toBe('pipeline');
    if (ast.type === 'pipeline') {
      expect(ast.commands[0]).toEqual({
        name: 'echo',
        args: ['hello'],
        redirect: { path: '/notes/out.txt', append: false },
      });
    }
  });

  it('parses append redirection', () => {
    const ast = parse('echo line >> /notes/log.txt');
    expect(ast.type).toBe('pipeline');
    if (ast.type === 'pipeline') {
      expect(ast.commands[0]?.redirect).toEqual({ path: '/notes/log.txt', append: true });
    }
  });
});