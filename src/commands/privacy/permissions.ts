import { defineCommand } from '../define';
import { error, formatTable, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { resolvePageTab } from '../shared/page-utils';
import { originFromUrl } from '../shared/url';

const SETTING_TYPES = [
  'cookies',
  'images',
  'javascript',
  'location',
  'popups',
  'notifications',
  'microphone',
  'camera',
  'clipboard',
] as const;

type SettingType = (typeof SETTING_TYPES)[number];
type SettingValue = 'allow' | 'block' | 'ask';

export const permissions = defineCommand({
  name: 'permissions',
  description: 'View or set site content permissions for the active page.',
  usage: 'permissions | permissions set <type> <allow|block|ask> | permissions reset <type>',
  examples: [
    'permissions',
    'permissions set notifications block',
    'permissions set javascript allow',
    'permissions reset location',
  ],
  category: 'utility',
  seeAlso: ['siteinfo', 'forget', 'cookies'],
  notes: 'Uses Chrome contentSettings API. Changes persist per-site.',
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    const sub = parts[0];

    const resolved = await resolvePageTab([], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };
    const tab = await ctx.chrome.tabs.get(resolved.ref.id);
    const url = tab?.url ?? '';
    if (!url.startsWith('http')) {
      return { stderr: error('Permissions require an http(s) page.'), exitCode: 1 };
    }
    const origin = originFromUrl(url);
    if (!origin) return { stderr: error('Could not resolve page origin.'), exitCode: 1 };

    if (sub === 'set') {
      const type = parts[1] as SettingType | undefined;
      const value = parts[2] as SettingValue | undefined;
      if (!type || !value || !SETTING_TYPES.includes(type)) {
        return { stderr: error(`Usage: permissions set <${SETTING_TYPES.join('|')}> <allow|block|ask>`), exitCode: 2 };
      }
      if (!['allow', 'block', 'ask'].includes(value)) {
        return { stderr: error('Value must be allow, block, or ask.'), exitCode: 2 };
      }
      await ctx.chrome.contentSettings.set({ primaryUrl: origin }, type, value);
      return { stdout: success(`Set ${type}=${value} for ${origin}`), exitCode: 0 };
    }

    if (sub === 'reset') {
      const type = parts[1] as SettingType | undefined;
      if (!type || !SETTING_TYPES.includes(type)) {
        return { stderr: error(`Usage: permissions reset <${SETTING_TYPES.join('|')}>`), exitCode: 2 };
      }
      await ctx.chrome.contentSettings.clear({ scope: 'regular' }, type);
      return { stdout: success(`Reset ${type} to default for all sites.`), exitCode: 0 };
    }

    if (sub && sub !== 'set' && sub !== 'reset') {
      return { stderr: error('Usage: permissions | permissions set <type> <value> | permissions reset <type>'), exitCode: 2 };
    }

    const rows: string[][] = [];
    for (const type of SETTING_TYPES) {
      try {
        const { setting } = await ctx.chrome.contentSettings.get({ primaryUrl: origin }, type);
        rows.push([type, setting]);
      } catch {
        rows.push([type, 'n/a']);
      }
    }

    return {
      stdout: `${origin}\n${formatTable(['Permission', 'Setting'], rows, { maxWidth: ctx.cols })}`,
      exitCode: 0,
    };
  },
});