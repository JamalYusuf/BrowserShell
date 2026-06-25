import type { ChromeAPI } from '@/chrome/api';
import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';

interface PageInputField {
  name: string;
  id: string;
  type: string;
  label: string;
}

interface PageTableInfo {
  index: number;
  rows: number;
  cols: number;
}

export class CurrentProvider implements VFSProvider {
  name = 'current';
  mountPoint = '/current';

  constructor(private chrome: ChromeAPI, private tabsProvider: import('./tabs').TabsProvider) {}

  private async getActiveTab() {
    const tabs = await this.chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab) throw new Error('No active tab in current window.');
    return tab;
  }

  private async runScript<T>(fn: (...args: unknown[]) => T, ...args: unknown[]): Promise<T> {
    const tab = await this.getActiveTab();
    return this.chrome.scripting.executeScript(tab.id, fn, ...args);
  }

  private async listInputFields(): Promise<PageInputField[]> {
    return this.runScript(() => {
      const fields: PageInputField[] = [];
      const seen = new Set<string>();

      for (const el of document.querySelectorAll('input, textarea, select')) {
        const html = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const type = (html as HTMLInputElement).type?.toLowerCase() ?? '';
        if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') continue;

        const name = html.getAttribute('name') || html.id || '';
        if (!name || seen.has(name)) continue;
        seen.add(name);

        let label = '';
        const id = html.id;
        if (id) {
          const lbl = document.querySelector(`label[for="${id}"]`);
          if (lbl) label = lbl.textContent?.trim() ?? '';
        }
        if (!label) {
          label = html.getAttribute('aria-label') || html.getAttribute('placeholder') || '';
        }

        fields.push({ name, id: html.id || '', type, label });
      }
      return fields;
    });
  }

  private async listTables(): Promise<PageTableInfo[]> {
    return this.runScript(() =>
      [...document.querySelectorAll('table')].map((t, i) => ({
        index: i + 1,
        rows: t.rows.length,
        cols: t.rows[0]?.cells.length ?? 0,
      })),
    );
  }

  async readdir(path: string): Promise<VFSEntry[]> {
    const tab = await this.getActiveTab();
    const normalized = path.replace(/\/+$/, '') || '/current';

    if (normalized === '/current/inputs') {
      const fields = await this.listInputFields();
      return fields.map((f) => ({
        name: f.name,
        path: `/current/inputs/${f.name}`,
        type: 'file' as const,
        meta: { type: f.type, label: f.label },
      }));
    }

    if (normalized === '/current/tables') {
      const tables = await this.listTables();
      return tables.map((t) => ({
        name: `table-${t.index}.json`,
        path: `/current/tables/table-${t.index}.json`,
        type: 'file' as const,
        meta: { rows: t.rows, cols: t.cols },
      }));
    }

    if (normalized !== '/current') {
      throw new Error(`Not a directory: ${path}`);
    }

    return [
      { name: 'meta.json', path: '/current/meta.json', type: 'file' },
      { name: 'url.txt', path: '/current/url.txt', type: 'file' },
      { name: 'title.txt', path: '/current/title.txt', type: 'file' },
      { name: 'content.txt', path: '/current/content.txt', type: 'file' },
      { name: 'content.md', path: '/current/content.md', type: 'file' },
      { name: 'selection.txt', path: '/current/selection.txt', type: 'file' },
      { name: 'structured.json', path: '/current/structured.json', type: 'file' },
      { name: 'forms.json', path: '/current/forms.json', type: 'file' },
      { name: 'inputs', path: '/current/inputs', type: 'directory' },
      { name: 'tables', path: '/current/tables', type: 'directory' },
      { name: 'tab', path: `/tabs/${tab.id}`, type: 'symlink', meta: { target: `/tabs/${tab.id}` } },
    ];
  }

  async read(path: string, options?: { raw?: boolean }): Promise<string | Uint8Array> {
    const tab = await this.getActiveTab();

    if (path === '/current/selection.txt') {
      const stored = await chrome.storage.local.get('pendingSelection');
      const pending = stored.pendingSelection as string | undefined;
      if (pending) return pending;
      return this.runScript(() => window.getSelection()?.toString() ?? '') as Promise<string>;
    }

    if (path === '/current/structured.json' || path === '/current/forms.json') {
      const data = await this.runScript(() => {
        const inputs = [...document.querySelectorAll('input, textarea, select')].map((el, i) => {
          const html = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          return {
            index: i + 1,
            tag: el.tagName.toLowerCase(),
            type: (html as HTMLInputElement).type || '',
            name: html.getAttribute('name') || '',
            id: html.id || '',
            value: html instanceof HTMLSelectElement ? html.value : (html as HTMLInputElement).value,
            placeholder: (html as HTMLInputElement).placeholder || '',
          };
        });
        const tables = [...document.querySelectorAll('table')].map((t, i) => ({
          index: i + 1,
          rows: t.rows.length,
          cols: t.rows[0]?.cells.length ?? 0,
        }));
        return { url: location.href, title: document.title, inputs, tables };
      });
      return options?.raw ? JSON.stringify(data) : JSON.stringify(data, null, 2);
    }

    if (path.startsWith('/current/tables/table-') && path.endsWith('.json')) {
      const index = Number(path.match(/table-(\d+)\.json$/)?.[1]) - 1;
      if (!Number.isFinite(index) || index < 0) throw new Error(`Invalid table path: ${path}`);
      const data = await this.runScript((...args: unknown[]) => {
        const idx = Number(args[0]);
        const table = document.querySelectorAll('table')[idx] as HTMLTableElement | undefined;
        if (!table) return null;
        const rows = [...table.rows].map((row) =>
          [...row.cells].map((cell) => cell.textContent?.trim() ?? ''),
        );
        return { index: idx + 1, rows };
      }, index);
      if (!data) throw new Error(`Table not found: ${path}`);
      return options?.raw ? JSON.stringify(data) : JSON.stringify(data, null, 2);
    }

    if (path.startsWith('/current/inputs/')) {
      const field = path.replace('/current/inputs/', '');
      const value = await this.runScript((...args: unknown[]) => {
        const fieldName = String(args[0] ?? '');
        const byName = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | null;
        const byId = document.getElementById(fieldName) as HTMLInputElement | null;
        const el = byName ?? byId;
        if (!el) return '';
        return (el as HTMLInputElement).value ?? el.textContent ?? '';
      }, field);
      return String(value ?? '');
    }

    if (path === '/current/content.md') {
      const text = (await this.tabsProvider.read(`/tabs/${tab.id}/content.txt`, options)) as string;
      return `# ${tab.title}\n\n${text}`;
    }

    const tabPath = `/tabs/${tab.id}/${path.replace('/current/', '')}`;
    return this.tabsProvider.read(tabPath, options);
  }

  async write(path: string, content: string): Promise<void> {
    if (!path.startsWith('/current/inputs/')) {
      throw new Error(`Write not supported for ${path}. Use /current/inputs/<field>.`);
    }
    const field = path.replace('/current/inputs/', '');
    const tab = await this.getActiveTab();
    await this.chrome.scripting.executeScript(
      tab.id,
      (...args: unknown[]) => {
        const fieldName = String(args[0] ?? '');
        const value = String(args[1] ?? '');
        const byName = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
        const byId = document.getElementById(fieldName) as HTMLInputElement | HTMLTextAreaElement | null;
        const el = byName ?? byId;
        if (!el) throw new Error(`Input not found: ${fieldName}`);
        el.focus();
        el.value = value;
        el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      field,
      content,
    );
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/current') return { path, type: 'directory' };
    if (path === '/current/inputs') return { path, type: 'directory' };
    if (path === '/current/tables') return { path, type: 'directory' };
    const tab = await this.getActiveTab();
    return {
      path,
      type: 'file',
      meta: { activeTabId: tab.id, title: tab.title, url: tab.url },
    };
  }

  async exists(path: string): Promise<boolean> {
    return path === '/current' || path.startsWith('/current/');
  }
}