import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const dist = join(import.meta.dirname, '..', 'dist');
const root = join(import.meta.dirname, '..');

function moveHtml(src: string, dest: string): void {
  if (!existsSync(src)) {
    console.warn(`Warning: ${src} not found`);
    return;
  }
  mkdirSync(join(dest, '..'), { recursive: true });
  copyFileSync(src, dest);
}

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

fixHtmlPaths(join(dist, 'overlay/index.html'), 'overlay');
fixHtmlPaths(join(dist, 'options/index.html'), 'options');

// public/manifest.json is the source of truth for permissions and metadata.
const manifestPath = join(root, 'public', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

const iconsSrc = join(root, 'public', 'icons');
const iconsDest = join(dist, 'icons');
if (existsSync(iconsSrc)) {
  mkdirSync(iconsDest, { recursive: true });
  for (const file of readdirSync(iconsSrc)) {
    copyFileSync(join(iconsSrc, file), join(iconsDest, file));
  }
}

console.log('Post-build complete. Extension ready in dist/');