import { defineCommand } from '../define';
import { error, formatJson, formatTable } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { auditSite } from '../shared/siteinfo-utils';

export const siteinfo = defineCommand({
  name: 'siteinfo',
  description: 'Audit cookies, history, and storage footprint for a site.',
  usage: 'siteinfo [domain] [--json] [--compare <domain>]',
  examples: ['siteinfo', 'siteinfo jamal.dev', 'siteinfo --compare github.com', 'siteinfo --json', 'forget --dry-run && siteinfo'],
  category: 'utility',
  seeAlso: ['forget', 'cookies', 'history', 'storage'],
  notes: 'Companion to forget — shows what would be cleared. --compare shows two sites side by side.',
  handler: async (args, ctx) => {
    const json = hasFlag(args, '--json');
    const compare = hasFlag(args, '--compare');
    const parts = filterFlags(args).filter((a) => a !== '--compare');

    if (compare) {
      let baseTarget: string | undefined;
      let otherTarget: string | undefined;
      if (parts.length >= 2) {
        [baseTarget, otherTarget] = [parts[0], parts.slice(1).join(' ')];
      } else if (parts.length === 1) {
        otherTarget = parts[0];
      } else {
        return { stderr: error('Usage: siteinfo --compare <domain>  |  siteinfo <domain> --compare <other>'), exitCode: 2 };
      }

      const base = await auditSite(ctx, baseTarget);
      if ('error' in base) return { stderr: error(base.error), exitCode: 1 };
      const other = await auditSite(ctx, otherTarget);
      if ('error' in other) return { stderr: error(other.error), exitCode: 1 };

      const rows = [
        ['cookies', String(base.cookies), String(other.cookies)],
        ['history', String(base.historyEntries), String(other.historyEntries)],
        ['open tabs', String(base.openTabs), String(other.openTabs)],
      ];
      if (json) return { stdout: formatJson({ base, other }), exitCode: 0 };
      return {
        stdout: `Compare ${base.domain} vs ${other.domain}\n${formatTable(['Metric', base.domain, other.domain], rows, { maxWidth: ctx.cols })}`,
        exitCode: 0,
      };
    }

    const target = parts.join(' ').trim() || undefined;
    const audit = await auditSite(ctx, target);
    if ('error' in audit) return { stderr: error(audit.error), exitCode: 1 };

    if (json) return { stdout: formatJson(audit), exitCode: 0 };

    const lines = [
      `${audit.domain} (${audit.origin})`,
      `  cookies:   ${audit.cookies}`,
      `  history:   ${audit.historyEntries} entr${audit.historyEntries === 1 ? 'y' : 'ies'}`,
      `  open tabs: ${audit.openTabs}`,
      `  data:      ${audit.dataTypes.join(', ')}`,
      '',
      `To wipe: ${audit.forgetCmd}`,
      `Preview: forget ${target || audit.domain} --dry-run`,
    ];

    return { stdout: lines.join('\n'), exitCode: 0 };
  },
});