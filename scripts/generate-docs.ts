/** Auto-generate command reference from registry metadata. */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { registerAllCommands } from '../src/commands/index.ts';
import { getRegistry } from '../src/shell/registry.ts';

registerAllCommands();
const registry = getRegistry();
const commands = registry.getAll().sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

let md = '# BrowserShell Command Reference\n\n> Auto-generated from command registry.\n\n';

let currentCategory = '';
for (const cmd of commands) {
  if (cmd.category !== currentCategory) {
    currentCategory = cmd.category;
    md += `## ${currentCategory}\n\n`;
  }
  md += `### \`${cmd.name}\`\n\n`;
  md += `${cmd.description}\n\n`;
  md += `**Usage:** \`${cmd.usage}\`\n\n`;
  md += '**Examples:**\n\n';
  for (const ex of cmd.examples) {
    md += `- \`${ex}\`\n`;
  }
  if (cmd.seeAlso?.length) {
    md += `\n**See also:** ${cmd.seeAlso.map((s) => `\`${s}\``).join(', ')}\n`;
  }
  md += '\n';
}

const outPath = join(import.meta.dirname, '..', 'docs', 'COMMANDS.md');
writeFileSync(outPath, md);
console.log(`Generated ${outPath} (${commands.length} commands)`);