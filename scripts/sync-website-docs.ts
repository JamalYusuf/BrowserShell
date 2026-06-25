/** Sync auto-generated command reference into the Hugo site. */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { registerAllCommands } from '../src/commands/index.ts';
import { getRegistry } from '../src/shell/registry.ts';

const root = join(import.meta.dirname, '..');
const source = join(root, 'docs', 'COMMANDS.md');
const dest = join(root, 'website', 'content', 'docs', 'commands', 'reference.md');
const hugoToml = join(root, 'website', 'hugo.toml');
const packageJson = join(root, 'package.json');

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

registerAllCommands();
const commandCount = getRegistry().getAll().length;
const version = JSON.parse(readFileSync(packageJson, 'utf-8')).version as string;
let hugo = readFileSync(hugoToml, 'utf-8');
hugo = hugo.replace(/command_count = \d+/, `command_count = ${commandCount}`);
hugo = hugo.replace(/extension_version = '[^']+'/, `extension_version = '${version}'`);
writeFileSync(hugoToml, hugo);
console.log(`Updated hugo.toml → ${commandCount} commands, v${version}`);