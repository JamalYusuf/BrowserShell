import { describe, expect, it } from 'vitest';
import { createMockChromeAPI } from '@/chrome/api';
import { registerAllCommands } from '@/commands';
import { ShellExecutor } from '@/shell/executor';

describe('command usability defaults', () => {
  it('close with no args closes current tab', async () => {
    let removed: number | undefined;
    registerAllCommands();
    const chrome = createMockChromeAPI({
      tabs: {
        ...createMockChromeAPI().tabs,
        remove: async (id) => {
          removed = Array.isArray(id) ? id[0] : id;
        },
      },
    });
    const executor = new ShellExecutor({ chrome, getHostTabId: () => 1, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('close');
    expect(result.exitCode).toBe(0);
    expect(removed).toBe(1);
    expect(result.stdout).toMatch(/Closed/i);
  });

  it('zoom with no args shows current zoom without changing it', async () => {
    let setZoomCalled = false;
    registerAllCommands();
    const chrome = createMockChromeAPI({
      tabs: {
        ...createMockChromeAPI().tabs,
        getZoom: async () => 1.25,
        setZoom: async () => {
          setZoomCalled = true;
        },
      },
    });
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('zoom');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('125%');
    expect(setZoomCalled).toBe(false);
  });

  it('open with no args creates a new tab', async () => {
    let created = false;
    registerAllCommands();
    const chrome = createMockChromeAPI({
      tabs: {
        ...createMockChromeAPI().tabs,
        create: async (props) => {
          created = true;
          return {
            id: 99,
            title: 'New Tab',
            url: props.url || 'chrome://newtab',
            active: true,
            pinned: false,
            windowId: 1,
            index: 2,
          };
        },
      },
    });
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('open');
    expect(result.exitCode).toBe(0);
    expect(created).toBe(true);
    expect(result.stdout).toMatch(/new tab/i);
  });

  it('bookmark with no args bookmarks current page', async () => {
    let bookmarked: { title?: string; url?: string } | undefined;
    registerAllCommands();
    const chrome = createMockChromeAPI({
      bookmarks: {
        ...createMockChromeAPI().bookmarks,
        create: async (props) => {
          bookmarked = props;
          return { id: '99', title: props.title || 'New', url: props.url };
        },
      },
    });
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('bookmark');
    expect(result.exitCode).toBe(0);
    expect(bookmarked?.url).toContain('example.com');
    expect(result.stdout).toMatch(/Bookmarked/i);
  });

  it('bookmark query searches without subcommand', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('bookmark project');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Project');
  });

  it('tab with no args lists tabs', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('tab');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Example');
  });

  it('link with no args lists links', async () => {
    registerAllCommands();
    document.body.innerHTML = '<a href="https://example.com">Example</a>';
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('link');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Example');
  });

  it('input 1 text fills without fill subcommand', async () => {
    registerAllCommands();
    const chrome = createMockChromeAPI();
    document.body.innerHTML = '<input id="q" placeholder="Search">';
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('input 1 hello');
    expect(result.exitCode).toBe(0);
    expect((document.getElementById('q') as HTMLInputElement).value).toBe('hello');
  });

  it('bookmark 1 opens from search results', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();
    await executor.execute('bookmark project');

    const result = await executor.execute('bookmark 1');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Switched|Opened|Focused/i);
  });

  it('window with no args lists windows', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('window');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('W#');
  });

  it('scroll with no args shows position', async () => {
    registerAllCommands();
    const executor = new ShellExecutor({ chrome: createMockChromeAPI(), onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('scroll');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Viewport');
  });

  it('tab 2 switches to tab #2', async () => {
    let activated: number | undefined;
    registerAllCommands();
    const chrome = createMockChromeAPI({
      tabs: {
        ...createMockChromeAPI().tabs,
        update: async (id, props) => {
          if (props.active) activated = id;
          return createMockChromeAPI().tabs.get(id);
        },
      },
    });
    const executor = new ShellExecutor({ chrome, onOutput: () => {} });
    await executor.initialize();

    const result = await executor.execute('tab 2');
    expect(result.exitCode).toBe(0);
    expect(activated).toBe(2);
    expect(result.stdout).toContain('GitHub');
  });
});