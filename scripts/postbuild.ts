import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const dist = join(import.meta.dirname, '..', 'dist');

function moveHtml(src: string, dest: string): void {
  if (!existsSync(src)) {
    console.warn(`Warning: ${src} not found`);
    return;
  }
  mkdirSync(join(dest, '..'), { recursive: true });
  copyFileSync(src, dest);
}

moveHtml(join(dist, 'src/sidepanel/index.html'), join(dist, 'sidepanel/index.html'));
moveHtml(join(dist, 'src/overlay/index.html'), join(dist, 'overlay/index.html'));
moveHtml(join(dist, 'src/options/index.html'), join(dist, 'options/index.html'));

function fixHtmlPaths(htmlPath: string, entryName: string): void {
  if (!existsSync(htmlPath)) return;
  let html = readFileSync(htmlPath, 'utf-8');
  html = html.replace(/\.\.\/\.\.\/assets\//g, '../assets/');
  html = html.replace(/"\/assets\//g, '"../assets/');
  html = html.replace(/href="\/assets\//g, 'href="../assets/');
  html = html.replace(/src="\.\/index\.ts"/g, () => {
    const assetsDir = join(dist, 'assets');
    if (!existsSync(assetsDir)) return 'src="./index.ts"';
    const files = readdirSync(assetsDir);
    const jsFile = files.find((f) => f.startsWith(entryName) && f.endsWith('.js'));
    return jsFile ? `src="../assets/${jsFile}"` : 'src="./index.ts"';
  });
  writeFileSync(htmlPath, html);
}

fixHtmlPaths(join(dist, 'sidepanel/index.html'), 'sidepanel');
fixHtmlPaths(join(dist, 'overlay/index.html'), 'overlay');
fixHtmlPaths(join(dist, 'options/index.html'), 'options');

const manifest = {
  manifest_version: 3,
  name: 'BrowserShell',
  version: '0.1.0',
  description: 'A shell for your browser — tabs, bookmarks, history, and AI as commands.',
  permissions: ['sidePanel', 'tabs', 'activeTab', 'storage', 'bookmarks', 'history', 'scripting'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  side_panel: {
    default_path: 'sidepanel/index.html',
  },
  action: {
    default_title: 'Open BrowserShell',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  options_page: 'options/index.html',
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content/overlay.js'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  web_accessible_resources: [
    {
      resources: ['overlay/index.html', 'assets/*'],
      matches: ['<all_urls>'],
    },
  ],
  commands: {
    'toggle-panel': {
      suggested_key: {
        default: 'Ctrl+Shift+K',
        mac: 'Command+Shift+K',
      },
      description: 'Open BrowserShell side panel',
    },
    'toggle-overlay': {
      description: 'Toggle Quake-style BrowserShell overlay (assign at chrome://extensions/shortcuts)',
    },
  },
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
};

writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

const iconsSrc = join(import.meta.dirname, '..', 'public', 'icons');
const iconsDest = join(dist, 'icons');
if (existsSync(iconsSrc)) {
  mkdirSync(iconsDest, { recursive: true });
  for (const file of readdirSync(iconsSrc)) {
    copyFileSync(join(iconsSrc, file), join(iconsDest, file));
  }
}

console.log('Post-build complete. Extension ready in dist/');