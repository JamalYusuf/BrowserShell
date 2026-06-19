import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerAllCommands } from '@/commands';
import { getRegistry } from '@/shell/registry';
import type { Command, DisplayMode, ShellConfig } from '@/shared/types';
import { DEFAULT_CONFIG, loadConfig, saveConfig } from '@/shared/storage';
import { FONT_PRESETS, THEME_PRESETS } from '@/shared/themes';
import './styles.css';

registerAllCommands();

type Tab = 'commands' | 'appearance' | 'overlay' | 'vfs' | 'permissions';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const [search, setSearch] = useState('');
  const [config, setConfig] = useState<ShellConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [capturingKey, setCapturingKey] = useState(false);
  const commands = getRegistry().getAll();

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

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

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

  const update = <K extends keyof ShellConfig>(key: K, value: ShellConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
    setSaved(false);
  };

  const handleTry = async (example: string) => {
    await chrome.storage.local.set({ pendingCommand: example });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'toggle-overlay' }).catch(() => {});
    }
  };

  const handleSave = async () => {
    await saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedTheme = THEME_PRESETS.find((t) => t.id === config.theme) ?? THEME_PRESETS[0]!;

  return (
    <div className="app">
      <header>
        <h1>BrowserShell</h1>
        <p>Customize your shell — themes, overlay, fonts, and commands.</p>
      </header>

      <nav className="tabs">
        {(['appearance', 'overlay', 'commands', 'vfs', 'permissions'] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {activeTab === 'appearance' && (
        <>
          <div className="settings-section">
            <h2>Color Theme</h2>
            <div className="theme-grid">
              {THEME_PRESETS.map((t) => (
                <button
                  key={t.id}
                  className={`theme-card ${config.theme === t.id ? 'selected' : ''}`}
                  onClick={() => update('theme', t.id)}
                >
                  <div className="theme-swatch" style={{ background: t.xterm.background }}>
                    <span style={{ color: t.xterm.foreground }}>abc</span>
                    <span style={{ color: t.xterm.green }}>$</span>
                    <span style={{ color: t.xterm.blue }}>█</span>
                  </div>
                  <div className="theme-name">{t.name}</div>
                  <div className="theme-desc">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h2>Typography</h2>
            <div className="setting-row">
              <label>Font</label>
              <select value={config.fontFamily} onChange={(e) => update('fontFamily', e.target.value)}>
                {FONT_PRESETS.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="setting-row">
              <label>Font size</label>
              <input
                type="range" min={10} max={20} value={config.fontSize}
                onChange={(e) => update('fontSize', Number(e.target.value))}
              />
              <span className="range-val">{config.fontSize}px</span>
            </div>
            <div className="setting-row">
              <label>Line height</label>
              <input
                type="range" min={1} max={2} step={0.1} value={config.lineHeight}
                onChange={(e) => update('lineHeight', Number(e.target.value))}
              />
              <span className="range-val">{config.lineHeight}</span>
            </div>
            <div className="setting-row">
              <label>Cursor blink</label>
              <input
                type="checkbox" checked={config.cursorBlink}
                onChange={(e) => update('cursorBlink', e.target.checked)}
              />
            </div>
          </div>

          <div className="settings-section">
            <h2>Prompt</h2>
            <div className="setting-row">
              <label>Format (PS1)</label>
              <input
                value={config.prompt} style={{ width: 280 }}
                onChange={(e) => update('prompt', e.target.value)}
              />
            </div>
            <div className="setting-row">
              <label>Prompt color</label>
              <input
                type="color"
                value={config.promptColor || selectedTheme.promptColor}
                onChange={(e) => update('promptColor', e.target.value)}
              />
              <button className="link-btn" onClick={() => update('promptColor', '')}>Reset to theme</button>
            </div>
            <div className="prompt-preview" style={{
              fontFamily: FONT_PRESETS.find((f) => f.id === config.fontFamily)?.family,
              fontSize: config.fontSize,
              background: selectedTheme.xterm.background,
              color: config.promptColor || selectedTheme.promptColor,
            }}>
              browser@browser:/$
            </div>
          </div>
        </>
      )}

      {activeTab === 'overlay' && (
        <>
          <div className="settings-section">
            <h2>Display Mode</h2>
            <div className="setting-row">
              <label>Interface</label>
              <select
                value={config.displayMode}
                onChange={(e) => update('displayMode', e.target.value as DisplayMode)}
              >
                <option value="overlay">Fullscreen overlay (recommended)</option>
                <option value="both">Overlay + side panel</option>
                <option value="sidepanel">Side panel only</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Enable overlay</label>
              <input
                type="checkbox" checked={config.overlayEnabled}
                onChange={(e) => update('overlayEnabled', e.target.checked)}
              />
            </div>
          </div>

          <div className="settings-section">
            <h2>Quake Toggle</h2>
            <div className="setting-row">
              <label>Toggle key</label>
              <input
                readOnly
                value={config.toggleKey === '`' ? '` (backtick)' : config.toggleKey}
                style={{ width: 120, textAlign: 'center', fontSize: 16 }}
              />
              <button type="button" className="btn-secondary" onClick={() => setCapturingKey(true)}>
                {capturingKey ? 'Press a key…' : 'Change'}
              </button>
              <span className="hint">
                Works on any page when overlay is closed. Also closes overlay when terminal is open.
                Or run: <code>config set toggleKey `</code>
              </span>
            </div>
            <div className="setting-row">
              <label>Side panel hotkey</label>
              <span className="hint">Cmd+Shift+K — change at chrome://extensions/shortcuts</span>
            </div>
          </div>

          <div className="settings-section">
            <h2>Overlay Style</h2>
            <p className="hint" style={{ marginBottom: 12 }}>
              Full-screen Quake-style terminal over the current page. Press <code>`</code> to toggle.
            </p>
            <div className="setting-row">
              <label>Opacity</label>
              <input
                type="range" min={0.5} max={1} step={0.01} value={config.overlayOpacity}
                onChange={(e) => update('overlayOpacity', Number(e.target.value))}
              />
              <span className="range-val">{Math.round(config.overlayOpacity * 100)}%</span>
            </div>
            <div className="setting-row">
              <label>Backdrop blur</label>
              <input
                type="range" min={0} max={20} value={config.backdropBlur}
                onChange={(e) => update('backdropBlur', Number(e.target.value))}
              />
              <span className="range-val">{config.backdropBlur}px</span>
            </div>
            <div className="setting-row">
              <label>Backdrop dim</label>
              <input
                type="range" min={0} max={0.8} step={0.05} value={config.backdropDim}
                onChange={(e) => update('backdropDim', Number(e.target.value))}
              />
              <span className="range-val">{Math.round(config.backdropDim * 100)}%</span>
            </div>
          </div>

          <div className="overlay-preview" style={{
            height: `${config.overlayHeight * 0.6}px`,
            opacity: config.overlayOpacity,
            backdropFilter: `blur(${config.backdropBlur}px)`,
            background: `${selectedTheme.xterm.background}ee`,
          }}>
            <div className="overlay-preview-bar" />
            <span style={{ color: selectedTheme.xterm.foreground, fontFamily: 'monospace', padding: 12 }}>
              browser@browser:/$ ls
            </span>
          </div>
        </>
      )}

      {activeTab === 'commands' && (
        <>
          <input
            className="search"
            placeholder="Search commands..."
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

      {activeTab === 'vfs' && (
        <div className="vfs-tree">
          <div className="dir">/</div>
          <div className="file">├── tabs/ — open browser tabs</div>
          <div className="file">├── bookmarks/ — bookmark tree</div>
          <div className="file">├── history/ — browsing history</div>
          <div className="file">├── current/ → active tab</div>
          <div className="file">├── config/ — rc, aliases, settings</div>
          <div className="file">└── scripts/ — shell scripts</div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <ul className="perm-list settings-section">
          <li><strong>tabs</strong> — List, create, close, and switch tabs</li>
          <li><strong>bookmarks</strong> — Add, search, and open bookmarks</li>
          <li><strong>history</strong> — Search browsing history</li>
          <li><strong>storage</strong> — Save aliases, history, and configuration</li>
          <li><strong>scripting</strong> — Read page content for cat and AI commands</li>
          <li><strong>sidePanel</strong> — Side panel terminal interface</li>
        </ul>
      )}

      <div className="save-bar">
        <button className="try-btn" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function CommandCard({ command, onTry }: { command: Command; onTry: (ex: string) => void }) {
  return (
    <div className="command-card">
      <h3>{command.name}</h3>
      <div className="category">{command.category}</div>
      <p>{command.description}</p>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{command.usage}</div>
      {command.examples.slice(0, 2).map((ex) => (
        <code key={ex}>{ex}</code>
      ))}
      {command.examples[0] && (
        <button className="try-btn" onClick={() => onTry(command.examples[0]!)}>
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