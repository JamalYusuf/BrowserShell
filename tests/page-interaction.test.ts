import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import {
  fillInputAtIndex,
  focusInputAtIndex,
  listPageInputs,
  pressKey,
  getPageMeta,
  listPageImages,
} from '@/commands/shared/page-scripts';
import { parseInputArgs } from '@/commands/shared/input-utils';
import { ShellExecutor } from '@/shell/executor';
import { formatPageMeta } from '@/shell/output';

describe('page interaction scripts', () => {
  it('listPageInputs finds fields', () => {
    document.body.innerHTML =
      '<label for="email">Email</label><input id="email" type="email" name="user_email" placeholder="you@mail.com">';
    const inputs = listPageInputs('', 10);
    expect(inputs.some((i) => i.label.includes('Email'))).toBe(true);
  });

  it('listPageInputs finds role=searchbox and shadow DOM inputs', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<input placeholder="Shadow search" name="shadow_q">';
    document.body.appendChild(host);
    document.body.insertAdjacentHTML('beforeend', '<div role="searchbox" aria-label="Site search"></div>');

    const inputs = listPageInputs('', 20);
    expect(inputs.some((i) => i.placeholder.includes('Shadow search'))).toBe(true);
    expect(inputs.some((i) => i.label.includes('Site search'))).toBe(true);
  });

  it('fillInputAtIndex fills by stable index', () => {
    document.body.innerHTML =
      '<input placeholder="First"><input placeholder="Second" id="target">';
    const result = fillInputAtIndex(2, 'hello', '');
    expect(result.ok).toBe(true);
    expect((document.getElementById('target') as HTMLInputElement).value).toBe('hello');
  });

  it('focusInputAtIndex focuses matching index', () => {
    document.body.innerHTML = '<input id="a"><input id="b">';
    const result = focusInputAtIndex(2, '');
    expect(result.ok).toBe(true);
    expect(document.activeElement?.id).toBe('b');
  });

  it('pressKey dispatches enter', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const result = pressKey('enter');
    expect(result.pressed).toBe(true);
    expect(result.key).toBe('Enter');
  });

  it('getPageMeta reads description', () => {
    document.head.innerHTML = '<meta name="description" content="Test page">';
    document.title = 'Test';
    const meta = getPageMeta();
    expect(meta.description).toBe('Test page');
    expect(meta.title).toBe('Test');
  });

  it('listPageImages finds img', () => {
    document.body.innerHTML = '<img src="https://example.com/logo.png" alt="Logo">';
    const images = listPageImages('logo', 10);
    expect(images.length).toBe(1);
    expect(images[0]!.alt).toBe('Logo');
  });
});

describe('parseInputArgs', () => {
  it('parses fill with text', () => {
    expect(parseInputArgs(['fill', '1', 'hello world'])).toMatchObject({
      action: 'fill',
      index: 1,
      value: 'hello world',
    });
  });

  it('parses index then text as fill shorthand', () => {
    expect(parseInputArgs(['1', 'hello world'])).toMatchObject({
      action: 'fill',
      index: 1,
      value: 'hello world',
    });
  });

  it('parses index then action', () => {
    expect(parseInputArgs(['2', 'clear'])).toMatchObject({ action: 'clear', index: 2 });
  });
});

describe('page interaction commands', () => {
  it('inputs lists fields', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    document.body.innerHTML = '<input placeholder="Search" name="q">';
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('inputs');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Search');
  });

  it('meta shows page info', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    document.head.innerHTML =
      '<title>Example Page</title><meta name="description" content="A test page">';
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('meta');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Example Page');
    expect(result.stdout).toContain('Description');
    expect(result.stdout).toContain('A test page');
  });

  it('input fill works end-to-end', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    document.body.innerHTML = '<input id="q" placeholder="Search">';
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('input fill 1 "cats"');
    expect(result.exitCode).toBe(0);
    expect((document.getElementById('q') as HTMLInputElement).value).toBe('cats');
  });
});

describe('formatPageMeta', () => {
  it('renders labeled table rows', () => {
    const out = formatPageMeta(
      { title: 'Hi', description: 'Desc', canonical: '', ogTitle: '', ogImage: '', author: '', keywords: '' },
      80
    );
    expect(out).toContain('Title');
    expect(out).toContain('Hi');
    expect(out).toContain('Description');
  });
});