import { defineCommand } from '../define';
import { error, success, warn } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { dryRunResult, forceRequiredResult, isDryRun, needsForce } from '../shared/confirm';
import { captureLiveSession, restoreSavedSession, sessionSummary } from '../shared/session-utils';
import {
  getSavedSession,
  listSavedSessions,
  putSavedSession,
  removeSavedSession,
} from '@/shared/session-store';

export const session = defineCommand({
  name: 'session',
  description: 'Save and restore window/tab layouts.',
  usage: 'session | session save <name> | session restore <name> | session delete <name> -f',
  examples: ['session', 'session save work', 'session restore work', 'session delete work -f'],
  category: 'utility',
  seeAlso: ['sessions', 'windows', 'tabs'],
  notes: 'Captures all http(s) tabs across windows. restore opens new windows (does not close existing).',
  handler: async (args, ctx) => {
    const positional = filterFlags(args);
    const sub = positional[0];
    const name = positional[1];
    const dryRun = isDryRun(args);
    const force = needsForce(args);

    if (!sub) {
      const saved = await listSavedSessions();
      if (!saved.length) return { stdout: warn('No saved sessions. Use: session save <name>'), exitCode: 0 };
      return {
        stdout: saved.map((s) => `  ${sessionSummary(s)}`).join('\n'),
        exitCode: 0,
      };
    }

    if (sub === 'save') {
      if (!name) return { stderr: error('Usage: session save <name>'), exitCode: 2 };
      const windows = await captureLiveSession(ctx.chrome);
      const tabCount = windows.reduce((n, w) => n + w.tabs.length, 0);
      if (!tabCount) return { stderr: error('No restorable tabs to save (need http/https pages).'), exitCode: 1 };

      if (dryRun) {
        return dryRunResult('save session', `${name}: ${windows.length} window(s), ${tabCount} tab(s)`, `session save ${name}`);
      }

      await putSavedSession({ name, savedAt: Date.now(), windows });
      return { stdout: success(`Saved session "${name}" — ${windows.length} window(s), ${tabCount} tab(s)`), exitCode: 0 };
    }

    if (sub === 'restore') {
      if (!name) return { stderr: error('Usage: session restore <name>'), exitCode: 2 };
      const saved = await getSavedSession(name);
      if (!saved) return { stderr: error(`Session not found: ${name}. Run session to list.`), exitCode: 1 };

      if (dryRun) {
        return dryRunResult('restore session', sessionSummary(saved), `session restore ${name}`);
      }

      const count = await restoreSavedSession(ctx.chrome, saved);
      return { stdout: success(`Restored "${name}" — opened ${count} tab(s) in ${saved.windows.length} window(s)`), exitCode: 0 };
    }

    if (sub === 'delete' || sub === 'rm') {
      if (!name) return { stderr: error('Usage: session delete <name> -f'), exitCode: 2 };
      if (dryRun) return dryRunResult('delete session', name, `session delete ${name} -f`);
      if (!force) return forceRequiredResult(`session delete ${name} -f`);

      const removed = await removeSavedSession(name);
      if (!removed) return { stderr: error(`Session not found: ${name}`), exitCode: 1 };
      return { stdout: success(`Deleted session "${name}"`), exitCode: 0 };
    }

    return { stderr: error('Usage: session [save|restore|delete] <name>'), exitCode: 2 };
  },
});