import { defineCommand } from '../define';
import { error, formatEnv, formatJson } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';

export const env = defineCommand({
  name: 'env',
  description: 'Show shell environment variables (set via export).',
  usage: 'env [VAR] [--json]',
  examples: ['env', 'env API_URL', 'export FOO=bar && env FOO'],
  category: 'builtin',
  seeAlso: ['export', 'alias', 'config'],
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    const name = parts[0];

    if (name) {
      const value = ctx.env[name];
      if (value === undefined) return { stderr: error(`Variable "${name}" not set.`), exitCode: 1 };
      if (hasFlag(args, '--json')) return { stdout: formatJson({ [name]: value }), exitCode: 0 };
      return { stdout: `${name}=${value}`, exitCode: 0 };
    }

    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(ctx.env), exitCode: 0, structured: ctx.env };
    }

    return { stdout: formatEnv(ctx.env, ctx.cols), exitCode: 0, structured: ctx.env };
  },
});