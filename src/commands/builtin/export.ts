import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import {
  downloadTranscriptFile,
  readTranscript,
  resolveTranscriptPath,
  saveTranscriptToPath,
} from '../shared/transcript-utils';

export const exportCmd = defineCommand({
  name: 'export',
  description: 'Set an environment variable or export the session transcript.',
  usage: 'export VAR=value | export log [path]',
  examples: ['export MY_VAR=hello', 'export HOME=/', 'export log', 'export log ~/session.txt'],
  category: 'builtin',
  seeAlso: ['clip', 'cat'],
  notes: 'export log saves the session transcript and downloads a copy. Default path: /scripts/browsershell-session.txt',
  handler: async (args, ctx) => {
    const positional = filterFlags(args);
    const sub = positional[0];

    if (sub === 'log') {
      const rawPath = positional.slice(1).join(' ').trim() || undefined;
      const vfsPath = resolveTranscriptPath(rawPath, ctx);
      const content = readTranscript();

      try {
        const { vfsPath: savedPath, downloadName } = await saveTranscriptToPath(ctx, vfsPath, content);
        downloadTranscriptFile(downloadName, content);
        return {
          stdout: success(`Exported session log to ${savedPath} (downloaded ${downloadName})`),
          exitCode: 0,
        };
      } catch (e) {
        return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
      }
    }

    const input = args.join(' ');
    const match = input.match(/^(?:export\s+)?(\w+)=(.*)$/);
    if (!match) return { stderr: error('Usage: export VAR=value | export log [path]'), exitCode: 2 };
    ctx.setEnv(match[1]!, match[2]!);
    return { stdout: '', exitCode: 0 };
  },
});