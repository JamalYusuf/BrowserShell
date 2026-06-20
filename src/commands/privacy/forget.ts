import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { dryRunResult, forceRequiredResult, isDryRun } from '../shared/confirm';
import { appendAuditEntry } from '@/shell/audit-log';
import { forgetTarget, parseForgetArgs, previewForget, resolveForgetPreset } from '../shared/privacy-utils';

export const forget = defineCommand({
  name: 'forget',
  description: 'Forget site data — cookies, cache, storage — like clearing data for one site.',
  usage: 'forget [domain] [cookies|cache|storage] | forget preset <name> [--history] [--all -f] [--dry-run]',
  examples: [
    'forget',
    'forget --dry-run',
    'forget jamal.dev -f',
    'forget preset light -f',
    'forget preset full --dry-run',
    'forget cookies -f',
    'forget --history -f',
    'forget --all -f',
  ],
  category: 'utility',
  seeAlso: ['history delete', 'history clear', 'cookies', 'storage'],
  notes: 'Use --dry-run to preview. Destructive actions require -f.',
  handler: async (args, ctx) => {
    let parsed = parseForgetArgs(args);
    const dryRun = isDryRun(args);
    const force = hasFlag(args, '-f', '--force');

    if (parsed.presetName) {
      const preset = await resolveForgetPreset(parsed.presetName);
      if (!preset) {
        return { stderr: error(`Unknown preset: ${parsed.presetName}. Check config forgetPresets.`), exitCode: 1 };
      }
      parsed = { ...preset, target: parsed.target, includeHistory: parsed.includeHistory || preset.includeHistory };
    }

    const preview = await previewForget(ctx, parsed);
    if ('error' in preview) return { stderr: error(preview.error), exitCode: 1 };

    if (dryRun || !force) {
      if (dryRun) return dryRunResult('forget', preview.summary, preview.confirmCmd);
      return forceRequiredResult(preview.confirmCmd, preview.summary);
    }

    try {
      const result = await forgetTarget(ctx, parsed);
      if ('error' in result) return { stderr: error(result.error), exitCode: 1 };

      const parts = [result.label];
      if (result.historyRemoved) parts.push(`${result.historyRemoved} history entr${result.historyRemoved === 1 ? 'y' : 'ies'}`);
      if (result.pageCleared) parts.push('live page storage');
      await appendAuditEntry(`forget: ${parts.join(', ')}`);
      return { stdout: success(`Forgot ${parts.join(', ')}`), exitCode: 0 };
    } catch (e) {
      return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
    }
  },
});