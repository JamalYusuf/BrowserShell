import { describe, expect, it } from 'vitest';
import { createMockChromeAPI, type ChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { ShellExecutor } from '@/shell/executor';
import {
  seekInPage,
  setPageVolume,
  listPageLinks,
  clickTarget,
  clickLinkAtIndex,
  setPageTitle,
} from '@/commands/shared/page-scripts';
import { parseLinkArgs } from '@/commands/shared/link-utils';
import { PAGE_SCRIPT_REGISTRY } from '@/commands/shared/page-script-registry';
import type { PageScriptName } from '@/commands/shared/page-script-registry';

describe('parseLinkArgs', () => {
  it('parses bare index', () => {
    expect(parseLinkArgs(['1'])).toMatchObject({ action: 'open', index: 1 });
  });

  it('parses index then action', () => {
    expect(parseLinkArgs(['1', 'copy'])).toMatchObject({ action: 'copy', index: 1 });
    expect(parseLinkArgs(['2', 'show'])).toMatchObject({ action: 'show', index: 2 });
  });

  it('parses subcommand + index without stealing index as tab ref', () => {
    expect(parseLinkArgs(['open', '3'])).toMatchObject({ action: 'open', index: 3, tabArg: undefined });
    expect(parseLinkArgs(['click', '4'])).toMatchObject({ action: 'click', index: 4 });
    expect(parseLinkArgs(['copy', '1'])).toMatchObject({ action: 'copy', index: 1 });
    expect(parseLinkArgs(['new', '2'])).toMatchObject({ action: 'new', index: 2, newTab: true });
    expect(parseLinkArgs(['show', '2'])).toMatchObject({ action: 'show', index: 2 });
  });

  it('parses explicit tab ref after index', () => {
    expect(parseLinkArgs(['open', '3', '2'])).toMatchObject({ action: 'open', index: 3, tabArg: '2' });
    expect(parseLinkArgs(['open', '3', '2@1'])).toMatchObject({ action: 'open', index: 3, tabArg: '2@1' });
  });

  it('parses find and flags', () => {
    expect(parseLinkArgs(['find', 'Home'])).toMatchObject({ action: 'find', query: 'Home' });
    expect(parseLinkArgs(['open', '1', '-n'])).toMatchObject({ action: 'open', index: 1, newTab: true });
    expect(parseLinkArgs(['copy', '1', '--md'])).toMatchObject({ action: 'copy', index: 1, markdown: true });
  });
});

describe('page script helpers', () => {
  it('seekInPage counts matches', () => {
    document.body.innerText = 'hello world\nhello again';
    const result = seekInPage('hello', false);
    expect(result.matches).toBe(2);
  });

  it('setPageVolume reports no media', () => {
    document.querySelectorAll('video, audio').forEach((el) => el.remove());
    expect(setPageVolume('status', 0).media).toBe(0);
  });

  it('listPageLinks finds anchors', () => {
    document.body.innerHTML = '<a href="https://example.com">Example</a><a href="https://github.com">GitHub</a>';
    const links = listPageLinks('git', 10);
    expect(links.some((l) => l.href.includes('github'))).toBe(true);
  });

  it('clickTarget clicks link by text', () => {
    document.body.innerHTML = '<a href="https://example.com/signin">Sign in</a><button>Cancel</button>';
    const result = clickTarget('Sign in');
    expect(result.clicked).toBe(true);
    expect(result.match).toBe('Sign in');
    expect(result.method).toBe('link');
    expect(result.href).toContain('signin');
  });

  it('clickTarget picks first matching link', () => {
    document.body.innerHTML =
      '<a href="https://example.com/about">About</a><a href="https://example.com/home">Home</a>';
    const result = clickTarget('Home');
    expect(result.clicked).toBe(true);
    expect(result.method).toBe('link');
    expect(result.href).toContain('home');
    expect(result.match).toBe('Home');
  });

  it('clickTarget returns first of multiple partial matches', () => {
    document.body.innerHTML = '<a href="https://a.com">Login</a><a href="https://b.com">Logout</a>';
    const result = clickTarget('Log');
    expect(result.clicked).toBe(true);
    expect(result.href).toContain('a.com');
  });

  it('clickLinkAtIndex targets numbered link', () => {
    document.body.innerHTML =
      '<a href="https://first.example.com">First</a><a href="https://second.example.com">Second</a>';
    const result = clickLinkAtIndex(2, '');
    expect(result.clicked).toBe(true);
    expect(result.href).toContain('second.example.com');
    expect(result.match).toBe('Second');
  });

  it('setPageTitle changes document title', () => {
    document.title = 'Old';
    expect(setPageTitle('New Tab Name')).toBe('New Tab Name');
    expect(document.title).toBe('New Tab Name');
  });
});

describe('page commands', () => {
  it('audible lists noisy tabs', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('audible');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('GitHub');
  });

  it('zoom sets percentage', async () => {
    let zoom = 1;
    const chrome = createMockChromeAPI({
      tabs: {
        ...createMockChromeAPI().tabs,
        getZoom: async () => zoom,
        setZoom: async (_id, factor) => { zoom = factor; },
      },
    });
    registerAllCommands();
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('zoom 150');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('150%');
    expect(zoom).toBe(1.5);
  });

  it('seek greps piped content', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('echo hello world | seek --grep hello');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello');
  });

  it('volume reports no media gracefully', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('volume');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No video/audio');
  });

  it('domain shows hostname', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('domain');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('example.com');
  });

  it('pinned lists pinned tabs', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('pinned');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('GitHub');
  });

  it('tabs --all shows cross-window tabs', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('tabs --all');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('W#1');
    expect(result.stdout).toContain('W#2');
  });

  it('reload --hard works', async () => {
    let hard = false;
    const chrome = createMockChromeAPI({
      tabs: {
        ...createMockChromeAPI().tabs,
        reload: async (_id, opts) => { hard = !!opts?.bypassCache; },
      },
    });
    registerAllCommands();
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('reload --hard');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Hard reloaded');
    expect(hard).toBe(true);
  });

  it('wait pauses execution', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const start = Date.now();
    const result = await executor.execute('wait 50');
    expect(result.exitCode).toBe(0);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it('link find navigates via href', async () => {
    let navigated = '';
    registerAllCommands();
    const chrome = createMockChromeAPI({
      tabs: {
        ...createMockChromeAPI().tabs,
        update: async (_id, props) => {
          navigated = props.url as string;
          return createMockChromeAPI().tabs.get(1);
        },
      },
    });
    document.body.innerHTML = '<a href="https://docs.example.com">Documentation</a>';
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('link find Documentation');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Documentation');
    expect(navigated).toContain('docs.example.com');
  });

  it('link open 3 opens third link from cached list', async () => {
    let navigated = '';
    registerAllCommands();
    const chrome = createMockChromeAPI({
      scripting: {
        ...createMockChromeAPI().scripting,
        executePageScript: (async (_id, scriptName) => {
          if (scriptName === 'listPageLinks') {
            return [
              { text: 'One', href: 'https://one.example.com' },
              { text: 'Two', href: 'https://two.example.com' },
              { text: 'Three', href: 'https://three.example.com' },
            ];
          }
          return { clicked: true, tag: 'a', match: 'Three', method: 'index', href: 'https://three.example.com' };
        }) as ChromeAPI['scripting']['executePageScript'],
      },
      tabs: {
        ...createMockChromeAPI().tabs,
        update: async (_id, props) => {
          navigated = props.url as string;
          return createMockChromeAPI().tabs.get(1);
        },
      },
    });
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    await executor.execute('links');
    const result = await executor.execute('link open 3');
    expect(result.exitCode).toBe(0);
    expect(navigated).toContain('three.example.com');
  });

  it('link show 2 prints link details', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI({
      scripting: {
        ...createMockChromeAPI().scripting,
        executePageScript: (async (_id, scriptName) => {
          if (scriptName === 'listPageLinks') {
            return [
              { text: 'One', href: 'https://one.example.com' },
              { text: 'Two', href: 'https://two.example.com' },
            ];
          }
          return undefined;
        }) as ChromeAPI['scripting']['executePageScript'],
      },
    });
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    await executor.execute('links');
    const result = await executor.execute('link show 2');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Two');
    expect(result.stdout).toContain('two.example.com');
  });

  it('links lists then link 1 opens first link', async () => {
    let navigated = '';
    registerAllCommands();
    const chrome = createMockChromeAPI({
      scripting: {
        ...createMockChromeAPI().scripting,
        executePageScript: (async (_id, scriptName) => {
          if (scriptName === 'listPageLinks') {
            return [
              { text: 'First', href: 'https://first.example.com' },
              { text: 'Second', href: 'https://second.example.com' },
            ];
          }
          return { clicked: true, tag: 'a', match: 'First', method: 'index', href: 'https://first.example.com' };
        }) as ChromeAPI['scripting']['executePageScript'],
      },
      tabs: {
        ...createMockChromeAPI().tabs,
        update: async (_id, props) => {
          navigated = props.url as string;
          return createMockChromeAPI().tabs.get(1);
        },
      },
    });
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const list = await executor.execute('links');
    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain('First');

    const open = await executor.execute('link 1');
    expect(open.exitCode).toBe(0);
    expect(open.stdout).toMatch(/first|Opened|#/i);
    expect(navigated).toContain('first.example.com');
  });

  it('link uses host tab id when provided', async () => {
    let scriptedTab = 0;
    registerAllCommands();
    const chrome = createMockChromeAPI({
      scripting: {
        ...createMockChromeAPI().scripting,
        executePageScript: (async (tabId, scriptName, args) => {
          scriptedTab = tabId;
          return PAGE_SCRIPT_REGISTRY[scriptName as PageScriptName]?.(...args);
        }) as ChromeAPI['scripting']['executePageScript'],
      },
      tabs: {
        ...createMockChromeAPI().tabs,
        get: async (id) => {
          const tab = createMockChromeAPI().tabs.get(id);
          return tab;
        },
      },
    });
    document.body.innerHTML = '<a href="https://host.example.com">Host</a>';
    const executor = new ShellExecutor({
      chrome,
      getHostTabId: () => 42,
      onOutput: () => {},
    });
    await executor.initialize();

    await executor.execute('links');
    expect(scriptedTab).toBe(42);
  });

  it('title command sets page title via script', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('title My Research');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('My Research');
    expect(document.title).toBe('My Research');
  });

  it('shot captures screenshot', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('shot');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Screenshot captured');
  });
});