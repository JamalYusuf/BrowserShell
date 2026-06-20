import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const PUBLIC_DIR = resolve('website/public');
const BASE_PATH = '/BrowserShell';

function walkHtml(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkHtml(full));
    } else if (entry.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function extractHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const re = /<a\s[^>]*href=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    hrefs.push(m[1] ?? m[2] ?? m[3]);
  }
  return hrefs;
}

function resolveInternal(href: string): string | null {
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
    return null;
  }
  if (href.startsWith('//')) return null;

  const [pathPart] = href.split('#');
  let path = pathPart;

  if (path.startsWith(BASE_PATH)) {
    path = path.slice(BASE_PATH.length) || '/';
  }

  if (!path.startsWith('/')) return null;

  const relative = path.replace(/^\//, '');
  const candidates = [
    join(PUBLIC_DIR, relative),
    join(PUBLIC_DIR, relative, 'index.html'),
    join(PUBLIC_DIR, relative + '.html'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return '__MISSING__';
}

const htmlFiles = walkHtml(PUBLIC_DIR);
const broken: { from: string; href: string; reason: string }[] = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const relFrom = file.replace(PUBLIC_DIR, '').replace(/\\/g, '/');

  for (const href of extractHrefs(html)) {
    const resolved = resolveInternal(href);
    if (resolved === null) continue;
    checked++;

    if (resolved === '__MISSING__') {
      broken.push({ from: relFrom, href, reason: 'target not found' });
      continue;
    }

    const pathOnly = href.split('#')[0];
    if (
      pathOnly.startsWith('/') &&
      !pathOnly.startsWith(BASE_PATH) &&
      pathOnly !== '/'
    ) {
      broken.push({ from: relFrom, href, reason: 'missing GitHub Pages base path' });
    }
  }
}

if (broken.length > 0) {
  console.error(`\n❌ ${broken.length} broken internal link(s) (${checked} checked):\n`);
  for (const { from, href, reason } of broken) {
    console.error(`  ${from} → ${href} (${reason})`);
  }
  process.exit(1);
}

console.log(`✓ All ${checked} internal links resolve (${htmlFiles.length} HTML files)`);