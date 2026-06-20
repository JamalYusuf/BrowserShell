/** Sync auto-generated command reference into the Hugo site. */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const root = join(import.meta.dirname, '..');
const source = join(root, 'docs', 'COMMANDS.md');
const dest = join(root, 'website', 'content', 'docs', 'commands', 'reference.md');

const raw = readFileSync(source, 'utf-8');
const body = raw
  .replace(/^# BrowserShell Command Reference\n\n/, '')
  .replace(/^> Auto-generated[^\n]*\n\n/, '');

const frontmatter = `---
title: "Command reference"
description: "Complete reference for all BrowserShell commands — auto-synced from the command registry."
weight: 90
group: Reference
---

> Auto-generated from the command registry. Run \`npm run generate-docs && npm run sync-website\` to update.

`;

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, frontmatter + body);
console.log(`Synced command reference → ${dest}`);