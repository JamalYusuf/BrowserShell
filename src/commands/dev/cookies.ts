import { defineCommand } from '../define';
import { error, formatCookies, formatJson, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { dryRunResult, forceRequiredResult, isDryRun, needsForce } from '../shared/confirm';
import { parseTabArg } from '../shared/dev-args';
import type { CookieInfo } from '../shared/dev-scripts';
import { forgetOrigin, resolveForgetOrigin } from '../shared/privacy-utils';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';
import { tabDomain } from '../shared/url';

export const cookies = defineCommand({
  name: 'cookies',
  description: 'List or clear cookies for the current page.',
  usage: 'cookies [clear -f] [--json] [#]',
  examples: ['cookies', 'cookies --json', 'cookies clear -f', 'audit && cookies'],
  category: 'utility',
  seeAlso: ['storage', 'forget', 'audit'],
  notes: 'Lists JS-visible cookies. clear wipes origin cookies via browsingData (includes httpOnly).',
  handler: async (args, ctx) => {
    const positional = filterFlags(args);
    const sub = positional[0];
    const dryRun = isDryRun(args);
    const force = needsForce(args);

    if (sub === 'clear') {
      const origin = await resolveForgetOrigin(ctx);
      if (!origin) return { stderr: error('No page to clear cookies for. Open an http(s) tab.'), exitCode: 1 };
      const domain = tabDomain(origin);

      if (dryRun) return dryRunResult('clear cookies', `all cookies for ${domain}`, 'cookies clear -f');
      if (!force) return forceRequiredResult('cookies clear -f', `Clear all cookies for ${domain}.`);

      await forgetOrigin(ctx.chrome, origin, 'cookies');

      return {
        stdout: success(`Cleared cookies for ${domain} (httpOnly cookies removed via browser API)`),
        exitCode: 0,
      };
    }

    const { tabArg } = parseTabArg(args);
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const data = await runPageScript(resolved.ref.id, ctx, 'listCookies');
    if (isScriptError(data)) return { stderr: error(data.error), exitCode: 1 };

    const items = data as CookieInfo[];
    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(items), exitCode: 0, structured: items };
    }

    if (ctx.piped) {
      return { stdout: items.map((c) => `${c.name}\t${c.value}`).join('\n'), exitCode: 0 };
    }

    return { stdout: formatCookies(items, ctx.cols), exitCode: 0, structured: items };
  },
});