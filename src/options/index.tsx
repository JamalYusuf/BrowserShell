import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerAllCommands } from '@/commands';
import { getRegistry } from '@/shell/registry';
import type { Command, CustomTheme, CustomThemeColors, ShellConfig } from '@/shared/types';
import { DEFAULT_CONFIG, loadConfig, saveConfig } from '@/shared/storage';
import {
  createCustomThemeFromPreset,
  customThemeToPreset,
  FONT_PRESETS,
  getThemePreset,
  THEME_PRESETS,
  type TerminalThemePreset,
} from '@/shared/themes';
import './styles.css';

registerAllCommands();

type Tab = 'appearance' | 'overlay' | 'commands' | 'vfs' | 'permissions';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'appearance', label: 'Terminal', icon: '▸', desc: 'Themes, fonts, and prompt styling' },
  { id: 'overlay', label: 'Overlay', icon: '◫', desc: 'Quake-style fullscreen overlay' },
  { id: 'commands', label: 'Commands', icon: '⌘', desc: 'Browse and try shell commands' },
  { id: 'vfs', label: 'Filesystem', icon: '◎', desc: 'Virtual filesystem layout' },
  { id: 'permissions', label: 'Permissions', icon: '⚿', desc: 'Extension capabilities' },
];

const CURSOR_STYLES = [
  { id: 'block' as const, label: 'Block' },
  { id: 'underline' as const, label: 'Underline' },
  { id: 'bar' as const, label: 'Bar' },
];

const PALETTE_KEYS = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan'] as const;

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const [search, setSearch] = useState('');
  const [config, setConfig] = useState<ShellConfig>(DEFAULT_CONFIG);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [capturingKey, setCapturingKey] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const commands = getRegistry().getAll();

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (!capturingKey) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') {
        setCapturingKey(false);
        return;
      }
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;
      const key = e.code === 'Backquote' && !e.shiftKey ? '`' : e.key;
      update('toggleKey', key);
      setCapturingKey(false);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [capturingKey]);

  const scheduleSave = useCallback((next: ShellConfig) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      await saveConfig(next);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    }, 450);
  }, []);

  const update = <K extends keyof ShellConfig>(key: K, value: ShellConfig[K]) => {
    setConfig((c) => {
      const next = { ...c, [key]: value };
      scheduleSave(next);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!search) return commands;
    const lower = search.toLowerCase();
    return commands.filter(
      (c) =>
        c.name.includes(lower) ||
        c.description.toLowerCase().includes(lower) ||
        c.category.includes(lower)
    );
  }, [commands, search]);

  const handleTry = async (example: string) => {
    await chrome.storage.local.set({ pendingCommand: example });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'toggle-overlay' }).catch(() => {});
    }
  };

  const selectedTheme = getThemePreset(config.theme, config.customThemes ?? []);
  const selectedFont = FONT_PRESETS.find((f) => f.id === config.fontFamily) ?? FONT_PRESETS[0]!;
  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;
  const showPreview = activeTab === 'appearance' || activeTab === 'overlay';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <div className="brand-icon">$</div>
            <div>
              <h1>BrowserShell</h1>
              <p>Terminal for your browser</p>
            </div>
          </div>
        </div>

        <nav className="nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <kbd>{config.toggleKey === '`' ? '`' : config.toggleKey}</kbd> toggle overlay
          <p>
            Press <kbd>Tab</kbd> to complete, <kbd>↑↓</kbd> for history, <kbd>Ctrl+R</kbd> to search.
          </p>
          <p>
            Run <kbd>options</kbd> in the terminal to reopen settings.{' '}
            <a href="https://jamalyusuf.github.io/browsershell/" target="_blank" rel="noopener noreferrer">
              Docs &amp; help
            </a>
          </p>
        </div>
      </aside>

      <main className="main">
        <header className="page-header">
          <h2>{activeTabMeta.label}</h2>
          <p>{activeTabMeta.desc}</p>
        </header>

        <div className={`content-split ${showPreview ? '' : 'single'}`}>
          <div className="settings-panel">
            {activeTab === 'appearance' && (
              <AppearanceSettings
                config={config}
                update={update}
                selectedTheme={selectedTheme}
                onCustomThemesChange={(themes) => update('customThemes', themes)}
              />
            )}
            {activeTab === 'overlay' && (
              <OverlaySettings
                config={config}
                update={update}
                selectedTheme={selectedTheme}
                capturingKey={capturingKey}
                setCapturingKey={setCapturingKey}
              />
            )}
            {activeTab === 'commands' && (
              <>
                <input
                  className="search"
                  placeholder="Search commands…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="command-grid">
                  {filtered.map((cmd) => (
                    <CommandCard key={cmd.name} command={cmd} onTry={handleTry} />
                  ))}
                </div>
              </>
            )}
            {activeTab === 'vfs' && <VfsTree />}
            {activeTab === 'permissions' && <PermissionsList />}
          </div>

          {showPreview && (
            <div className="preview-panel">
              <TerminalPreview
                config={config}
                theme={selectedTheme}
                font={selectedFont}
                overlay={activeTab === 'overlay'}
              />
            </div>
          )}
        </div>
      </main>

      {saveState !== 'idle' && (
        <div className={`save-toast ${saveState === 'saved' ? 'saved' : ''}`}>
          <span className="dot" />
          {saveState === 'saving' ? 'Saving…' : 'Settings saved'}
        </div>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
  badge,
  username = 'user',
}: {
  theme: TerminalThemePreset;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
  username?: string;
}) {
  return (
    <button className={`theme-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="theme-preview" style={{ background: theme.xterm.background, color: theme.xterm.foreground }}>
        <div style={{ color: theme.promptColor }}>{username}@browser:~$</div>
        <div>
          <span style={{ color: theme.xterm.blue }}>ls</span>
          <span style={{ color: theme.xterm.green }}> tabs</span>
        </div>
      </div>
      <div className="theme-palette">
        {PALETTE_KEYS.map((k) => (
          <span key={k} style={{ background: theme.xterm[k] }} />
        ))}
      </div>
      <div className="theme-name">
        {theme.name}
        {badge && <span className="theme-badge">{badge}</span>}
      </div>
      <div className="theme-desc">{theme.description}</div>
    </button>
  );
}

function AppearanceSettings({
  config,
  update,
  selectedTheme,
  onCustomThemesChange,
}: {
  config: ShellConfig;
  update: <K extends keyof ShellConfig>(key: K, value: ShellConfig[K]) => void;
  selectedTheme: TerminalThemePreset;
  onCustomThemesChange: (themes: CustomTheme[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const customThemes = config.customThemes ?? [];

  const addCustom = () => {
    const base = getThemePreset(config.theme, customThemes);
    const created = createCustomThemeFromPreset('My Theme', base);
    onCustomThemesChange([...customThemes, created]);
    update('theme', created.id);
    setEditingId(created.id);
  };

  const updateCustomColor = (id: string, key: keyof CustomThemeColors, value: string) => {
    onCustomThemesChange(
      customThemes.map((t) =>
        t.id === id ? { ...t, colors: { ...t.colors, [key]: value } } : t
      )
    );
  };

  const renameCustom = (id: string, name: string) => {
    onCustomThemesChange(customThemes.map((t) => (t.id === id ? { ...t, name } : t)));
  };

  const deleteCustom = (id: string) => {
    onCustomThemesChange(customThemes.filter((t) => t.id !== id));
    if (config.theme === id) update('theme', 'redline');
    if (editingId === id) setEditingId(null);
  };

  return (
    <>
      <div className="card">
        <div className="card-title">Built-in themes</div>
        <div className="theme-grid">
          {THEME_PRESETS.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              selected={config.theme === t.id}
              onSelect={() => update('theme', t.id)}
              username={config.username || 'user'}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header-row">
          <div className="card-title" style={{ marginBottom: 0 }}>Custom themes</div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addCustom}>
            + New from current
          </button>
        </div>
        <p className="card-desc">Create your own palette. Edit colors below or duplicate a built-in theme.</p>
        {customThemes.length > 0 ? (
          <div className="theme-grid">
            {customThemes.map((ct) => {
              const preset = customThemeToPreset(ct);
              return (
                <ThemeCard
                  key={ct.id}
                  theme={preset}
                  selected={config.theme === ct.id}
                  badge="custom"
                  onSelect={() => update('theme', ct.id)}
                  username={config.username || 'user'}
                />
              );
            })}
          </div>
        ) : (
          <p className="hint">No custom themes yet. Click “New from current” to start.</p>
        )}

        {customThemes.length > 0 && (
          <div className="custom-editor-list">
            {customThemes.map((ct) => (
              <div key={ct.id} className="custom-editor">
                <button
                  type="button"
                  className={`custom-editor-toggle ${editingId === ct.id ? 'open' : ''}`}
                  onClick={() => setEditingId(editingId === ct.id ? null : ct.id)}
                >
                  <span>{ct.name}</span>
                  <span className="hint">edit colors</span>
                </button>
                {editingId === ct.id && (
                  <div className="custom-editor-body">
                    <div className="setting">
                      <div className="setting-info"><label>Name</label></div>
                      <div className="setting-control">
                        <input
                          type="text"
                          value={ct.name}
                          onChange={(e) => renameCustom(ct.id, e.target.value)}
                        />
                      </div>
                    </div>
                    {(
                      [
                        ['background', 'Background'],
                        ['foreground', 'Text'],
                        ['cursor', 'Cursor'],
                        ['promptColor', 'Prompt'],
                        ['accentColor', 'Accent'],
                        ['red', 'Red'],
                        ['green', 'Green'],
                        ['yellow', 'Yellow'],
                        ['blue', 'Blue'],
                        ['magenta', 'Magenta'],
                        ['cyan', 'Cyan'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="color-field">
                        <label>{label}</label>
                        <input
                          type="color"
                          value={ct.colors[key] ?? '#000000'}
                          onChange={(e) => updateCustomColor(ct.id, key, e.target.value)}
                        />
                        <code>{ct.colors[key]}</code>
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => deleteCustom(ct.id)}>
                      Delete theme
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Typography</div>
        <div className="setting">
          <div className="setting-info">
            <label>Font family</label>
            <span>Monospace face for the terminal</span>
          </div>
          <div className="setting-control">
            <select value={config.fontFamily} onChange={(e) => update('fontFamily', e.target.value)}>
              {FONT_PRESETS.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Font size</label>
            <span>Terminal text size in pixels</span>
          </div>
          <div className="setting-control">
            <div className="range-wrap">
              <input
                type="range" min={10} max={22} value={config.fontSize}
                onChange={(e) => update('fontSize', Number(e.target.value))}
              />
              <span className="range-val">{config.fontSize}px</span>
            </div>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Line height</label>
            <span>Vertical spacing between lines</span>
          </div>
          <div className="setting-control">
            <div className="range-wrap">
              <input
                type="range" min={1} max={2} step={0.05} value={config.lineHeight}
                onChange={(e) => update('lineHeight', Number(e.target.value))}
              />
              <span className="range-val">{config.lineHeight.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Letter spacing</label>
            <span>Extra space between characters</span>
          </div>
          <div className="setting-control">
            <div className="range-wrap">
              <input
                type="range" min={0} max={2} step={0.1} value={config.letterSpacing ?? 0}
                onChange={(e) => update('letterSpacing', Number(e.target.value))}
              />
              <span className="range-val">{(config.letterSpacing ?? 0).toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Cursor</div>
        <div className="setting">
          <div className="setting-info">
            <label>Cursor style</label>
            <span>How the insertion point appears</span>
          </div>
          <div className="setting-control">
            <div className="segmented">
              {CURSOR_STYLES.map((s) => (
                <button
                  key={s.id}
                  className={(config.cursorStyle ?? 'block') === s.id ? 'active' : ''}
                  onClick={() => update('cursorStyle', s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Cursor blink</label>
            <span>Animate the cursor on and off</span>
          </div>
          <div className="setting-control">
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.cursorBlink}
                onChange={(e) => update('cursorBlink', e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Prompt</div>
        <div className="setting">
          <div className="setting-info">
            <label>Username</label>
            <span>Shown as <code>\u</code> in the prompt — run <code>user set &lt;name&gt;</code> in the terminal</span>
          </div>
          <div className="setting-control">
            <input
              type="text"
              value={config.username || 'user'}
              maxLength={24}
              style={{ minWidth: 140 }}
              onChange={(e) => {
                const username = e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24) || 'user';
                update('username', username);
                update('env', { ...config.env, USER: username });
              }}
            />
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Welcome banner</label>
            <span>Time, tab count, weather, and tips when the terminal opens</span>
          </div>
          <div className="setting-control">
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.welcomeEnabled !== false}
                onChange={(e) => update('welcomeEnabled', e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Prompt color</label>
            <span>Override theme default or reset</span>
          </div>
          <div className="setting-control">
            <input
              type="color"
              value={config.promptColor || selectedTheme.promptColor}
              onChange={(e) => update('promptColor', e.target.value)}
            />
            <button className="link-btn" onClick={() => update('promptColor', '')}>Reset</button>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>PS1 format</label>
            <span>Prompt template (future expansion)</span>
          </div>
          <div className="setting-control">
            <input
              type="text"
              value={config.prompt}
              style={{ minWidth: 200 }}
              onChange={(e) => update('prompt', e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function OverlaySettings({
  config,
  update,
  selectedTheme,
  capturingKey,
  setCapturingKey,
}: {
  config: ShellConfig;
  update: <K extends keyof ShellConfig>(key: K, value: ShellConfig[K]) => void;
  selectedTheme: TerminalThemePreset;
  capturingKey: boolean;
  setCapturingKey: (v: boolean) => void;
}) {
  return (
    <>
      <div className="card">
        <div className="card-title">Overlay</div>
        <p className="card-desc">
          Full-screen Quake-style terminal over the current page. Press your toggle key or click the extension icon.
        </p>
        <div className="setting">
          <div className="setting-info">
            <label>Enabled</label>
            <span>Show overlay on toggle key and extension click</span>
          </div>
          <div className="setting-control">
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.overlayEnabled}
                onChange={(e) => update('overlayEnabled', e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Toggle key</label>
            <span>Works on any page, even in inputs</span>
          </div>
          <div className="setting-control">
            <input
              readOnly
              value={config.toggleKey === '`' ? '` backtick' : config.toggleKey}
              style={{ width: 100, textAlign: 'center', fontFamily: 'monospace' }}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCapturingKey(true)}>
              {capturingKey ? 'Press a key…' : 'Change'}
            </button>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Keyboard shortcut</label>
            <span>Global Chrome extension shortcut</span>
          </div>
          <div className="setting-control">
            <span className="hint"><kbd>Cmd+Shift+K</kbd> at chrome://extensions/shortcuts</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Overlay appearance</div>
        <div className="setting">
          <div className="setting-info">
            <label>Shell opacity</label>
            <span>Terminal background transparency</span>
          </div>
          <div className="setting-control">
            <div className="range-wrap">
              <input
                type="range" min={0.5} max={1} step={0.01} value={config.overlayOpacity}
                onChange={(e) => update('overlayOpacity', Number(e.target.value))}
              />
              <span className="range-val">{Math.round(config.overlayOpacity * 100)}%</span>
            </div>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Backdrop blur</label>
            <span>Blur the page behind the overlay</span>
          </div>
          <div className="setting-control">
            <div className="range-wrap">
              <input
                type="range" min={0} max={24} value={config.backdropBlur}
                onChange={(e) => update('backdropBlur', Number(e.target.value))}
              />
              <span className="range-val">{config.backdropBlur}px</span>
            </div>
          </div>
        </div>
        <div className="setting">
          <div className="setting-info">
            <label>Backdrop dim</label>
            <span>Darken the page behind the shell</span>
          </div>
          <div className="setting-control">
            <div className="range-wrap">
              <input
                type="range" min={0} max={0.8} step={0.05} value={config.backdropDim}
                onChange={(e) => update('backdropDim', Number(e.target.value))}
              />
              <span className="range-val">{Math.round(config.backdropDim * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="overlay-demo">
          <div
            className="overlay-demo-backdrop"
            style={{
              opacity: config.backdropDim,
              backdropFilter: `blur(${config.backdropBlur}px)`,
            }}
          />
          <div
            className="overlay-demo-shell"
            style={{
              opacity: config.overlayOpacity,
              background: `${selectedTheme.xterm.background}ee`,
            }}
          >
            <div
              className="overlay-demo-bar"
              style={{
                background: `linear-gradient(90deg, ${selectedTheme.xterm.blue}, ${selectedTheme.xterm.magenta}, ${selectedTheme.xterm.green})`,
              }}
            />
            <div
              className="overlay-demo-body"
              style={{ color: selectedTheme.xterm.foreground }}
            >
              <span style={{ color: selectedTheme.promptColor }}>{config.username || 'user'}@browser:~$</span> here
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TerminalPreview({
  config,
  theme,
  font,
  overlay,
}: {
  config: ShellConfig;
  theme: TerminalThemePreset;
  font: (typeof FONT_PRESETS)[number];
  overlay: boolean;
}) {
  const promptColor = config.promptColor || theme.promptColor;
  const cursorClass = config.cursorStyle ?? 'block';
  const showBlink = config.cursorBlink;

  const style = {
    '--preview-bg': theme.xterm.background,
    '--preview-fg': theme.xterm.foreground,
    '--preview-prompt': promptColor,
    '--preview-cursor': theme.xterm.cursor,
    '--preview-accent': theme.xterm.blue,
    '--preview-purple': theme.xterm.magenta,
    '--preview-green': theme.xterm.green,
    '--preview-font': font.family,
    '--preview-size': `${config.fontSize}px`,
    '--preview-lh': String(config.lineHeight),
    '--preview-spacing': `${config.letterSpacing ?? 0}px`,
  } as React.CSSProperties;

  return (
    <div className="preview-card" style={style}>
      <div className="preview-header">
        <div className="preview-dots">
          <span /><span /><span />
        </div>
        <span className="preview-label">live preview</span>
      </div>
      <div className="preview-accent-bar" />
      <div className="terminal-preview">
        <div className="term-line term-dim">BrowserShell · Fri 3:42 PM · 12 tabs · 2 windows</div>
        <div className="term-line">
          <span className="term-prompt">{config.username || 'user'}@browser:~$ </span>
          <span style={{ color: theme.xterm.foreground }}>tabs</span>
        </div>
        <div className="term-line">
          <span style={{ color: theme.xterm.yellow }}>●</span>
          {' '}
          <span style={{ color: theme.xterm.foreground }}>1  Example</span>
          <span className="term-dim">  https://example.com</span>
        </div>
        <div className="term-line">
          <span className="term-dim">  </span>
          <span style={{ color: theme.xterm.foreground }}>2  GitHub</span>
          <span className="term-dim">  https://github.com</span>
        </div>
        <div className="term-line">
          <span className="term-prompt">{config.username || 'user'}@browser:~$ </span>
          <span style={{ color: theme.xterm.blue }}>go</span>
          {' '}
          <span style={{ color: theme.xterm.cyan }}>docs</span>
          {showBlink && (
            <span className={`term-cursor ${cursorClass}`} />
          )}
        </div>
        <div className="term-line term-dim" style={{ marginTop: 8 }}>
          <span style={{ color: theme.xterm.red }}>stderr</span> only on errors
        </div>
        <div className="term-line">
          <span style={{ color: theme.xterm.green }}>✓</span>
          {' '}
          <span style={{ color: theme.xterm.foreground }}>Opened tab #2</span>
        </div>
      </div>
      <dl className="preview-meta">
        <div>
          <dt>Theme</dt>
          <dd>{theme.name}</dd>
        </div>
        <div>
          <dt>Font</dt>
          <dd>{font.name} {config.fontSize}px</dd>
        </div>
        <div>
          <dt>Cursor</dt>
          <dd>{config.cursorStyle ?? 'block'}{config.cursorBlink ? ' · blink' : ''}</dd>
        </div>
        <div>
          <dt>Overlay</dt>
          <dd>{overlay ? `${Math.round(config.overlayOpacity * 100)}% opacity` : '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

function VfsTree() {
  return (
    <div className="vfs-tree">
      <div className="dir">/</div>
      <div className="file">├── tabs/       open browser tabs</div>
      <div className="file">├── bookmarks/  bookmark tree</div>
      <div className="file">├── history/    browsing history</div>
      <div className="file">├── current/ →  active tab symlink</div>
      <div className="file">├── config/     rc, aliases, env</div>
      <div className="file">├── transcript/ session.txt, live.txt</div>
      <div className="file">├── notes/      writable scratch notes</div>
      <div className="file">├── audit/      destructive command log</div>
      <div className="file">└── scripts/    shell scripts</div>
    </div>
  );
}

function PermissionsList() {
  const perms = [
    { key: 'tabs', desc: 'List, create, close, and switch tabs' },
    { key: 'bookmarks', desc: 'Add, search, and open bookmarks' },
    { key: 'history', desc: 'Search and delete browsing history' },
    { key: 'browsingData', desc: 'Forget site data — cookies, cache, storage' },
    { key: 'downloads', desc: 'List, open, and remove downloads' },
    { key: 'cookies', desc: 'Inspect site cookies' },
    { key: 'management', desc: 'List and manage extensions' },
    { key: 'sessions', desc: 'Restore recently closed tabs/windows' },
    { key: 'notifications', desc: 'Desktop notifications via notify' },
    { key: 'contentSettings', desc: 'Site permissions via permissions command' },
    { key: 'storage', desc: 'Persist aliases, history, and settings' },
    { key: 'scripting', desc: 'Interact with pages — links, inputs, images, read, meta' },
  ];

  return (
    <div className="perm-grid">
      {perms.map((p) => (
        <div key={p.key} className="perm-item">
          <strong>{p.key}</strong>
          <span>{p.desc}</span>
        </div>
      ))}
    </div>
  );
}

function CommandCard({ command, onTry }: { command: Command; onTry: (ex: string) => void }) {
  return (
    <div className="command-card">
      <h3>{command.name}</h3>
      <span className="badge">{command.category}</span>
      <p>{command.description}</p>
      {command.examples.slice(0, 2).map((ex) => (
        <code key={ex}>{ex}</code>
      ))}
      {command.examples[0] && (
        <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => onTry(command.examples[0]!)}>
          Try in terminal
        </button>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);