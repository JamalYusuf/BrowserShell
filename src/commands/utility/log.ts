import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { clearTranscript, getTranscript } from '@/shell/transcript';

export const log = defineCommand({
  name: 'log',
  description: 'View or clear the session transcript.',
  usage: 'log | log clear',
  examples: ['log', 'log clear', 'cat /transcript/live.txt', 'clip log'],
  category: 'utility',
  seeAlso: ['export', 'clip', 'cat'],
  notes: 'Transcript also at /transcript/live.txt. export log saves + downloads a copy.',
  handler: async (args, ctx) => {
    const sub = filterFlags(args)[0];

    if (sub === 'clear') {
      clearTranscript();
      return { stdout: success('Session transcript cleared.'), exitCode: 0 };
    }

    if (sub) return { stderr: error('Usage: log | log clear'), exitCode: 2 };

    const text = getTranscript().trimEnd();
    if (!text) return { stdout: '(empty session — run a few commands first)', exitCode: 0 };
    if (ctx.piped) return { stdout: text, exitCode: 0 };
    return { stdout: text, exitCode: 0 };
  },
});