import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { parseStorageArgs } from '@/commands/shared/dev-args';
import {
  detectTech,
  getPageAudit,
  getViewportInfo,
  listCookies,
  listStorage,
} from '@/commands/shared/dev-scripts';
import { ShellExecutor } from '@/shell/executor';

describe('parseStorageArgs', () => {
  it('parses list with area', () => {
    expect(parseStorageArgs(['session', 'auth'])).toMatchObject({
      area: 'session',
      action: 'list',
      pattern: 'auth',
    });
  });

  it('parses get with area suffix', () => {
    expect(parseStorageArgs(['get', 'token', 'session'])).toMatchObject({
      area: 'session',
      action: 'get',
      key: 'token',
    });
  });
});

describe('dev page scripts', () => {
  it('getPageAudit counts DOM', () => {
    document.body.innerHTML = '<div><p>Hi</p><img src="x"><a href="/">x</a></div>';
    const audit = getPageAudit();
    expect(audit.domNodes).toBeGreaterThan(3);
    expect(audit.images).toBe(1);
  });

  it('detectTech finds generator meta', () => {
    document.head.innerHTML = '<meta name="generator" content="WordPress 6.4">';
    const tech = detectTech();
    expect(tech.some((t) => t.name === 'Generator')).toBe(true);
  });

  it('listStorage reads localStorage', () => {
    localStorage.setItem('test_key', 'hello');
    const items = listStorage('local', 'test', 10);
    expect(items.some((i) => i.key === 'test_key')).toBe(true);
  });

  it('listCookies parses document.cookie', () => {
    document.cookie = 'session=abc123; theme=dark';
    const cookies = listCookies();
    expect(cookies.some((c) => c.name === 'session')).toBe(true);
  });

  it('getViewportInfo returns viewport shape', () => {
    const vp = getViewportInfo();
    expect(vp).toMatchObject({
      innerWidth: expect.any(Number),
      innerHeight: expect.any(Number),
      scrollX: expect.any(Number),
      scrollY: expect.any(Number),
      devicePixelRatio: expect.any(Number),
      scrollPercent: expect.any(Number),
    });
  });
});

describe('dev commands', () => {
  it('audit shows metrics', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    document.body.innerHTML = '<form><input></form>';
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('audit');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('DOM nodes');
    expect(result.stdout).toContain('Forms');
  });

  it('tech lists stack signals', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    document.head.innerHTML = '<meta name="generator" content="Gatsby 5">';
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('tech');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Generator');
  });

  it('env lists exported vars', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();
    await executor.execute('export DEV=1');

    const result = await executor.execute('env');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('DEV');
  });

  it('storage get reads key', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    localStorage.setItem('api_url', 'https://api.example.com');
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('storage get api_url');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('api.example.com');
  });

  it('viewport alias vp works', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('vp');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Viewport');
  });
});