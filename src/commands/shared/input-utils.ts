import type { ExecutionContext } from '@/shared/types';
import { error, success } from '@/shell/output';
import { filterFlags } from './args';
import { isScriptError, resolvePageTab, runPageScript } from './page-utils';
import type { PageInput } from './page-scripts';

export type InputAction = 'focus' | 'fill' | 'clear' | 'show';

export interface ParsedInputArgs {
  tabArg?: string;
  action: InputAction;
  index?: number;
  value?: string;
}

const INPUT_ACTIONS = new Set<InputAction>(['focus', 'fill', 'clear', 'show']);

export function parseInputArgs(args: string[]): ParsedInputArgs {
  const parts = filterFlags(args).filter((a) => !a.startsWith('--'));
  let tabArg: string | undefined;
  if (parts.length > 1 && /^\d+@\d+$/.test(parts[parts.length - 1]!)) {
    tabArg = parts.pop();
  }

  if (!parts.length) return { action: 'focus', tabArg };

  const head = parts[0]!;
  if (INPUT_ACTIONS.has(head as InputAction)) {
    const action = head as InputAction;
    const rest = parts.slice(1);
    const num = rest[0];
    if (num && /^\d+$/.test(num)) {
      const index = Number(num);
      if (action === 'fill') {
        const textParts = rest.slice(1);
        if (textParts.length > 1 && /^\d+$/.test(textParts[textParts.length - 1]!)) {
          tabArg = textParts.pop();
        }
        return { action, index, value: textParts.join(' ').trim(), tabArg };
      }
      const trailing = rest[1];
      if (trailing && /^\d+$/.test(trailing)) tabArg = trailing;
      return { action, index, tabArg };
    }
    return { action, tabArg };
  }

  if (/^\d+$/.test(head)) {
    const index = Number(head);
    const rest = parts.slice(1);
    const second = rest[0];
    if (second && INPUT_ACTIONS.has(second as InputAction)) {
      const action = second as InputAction;
      const after = rest.slice(1);
      if (action === 'fill') {
        if (after.length > 1 && /^\d+(@\d+)?$/.test(after[after.length - 1]!)) tabArg = after.pop();
        return { action, index, value: after.join(' ').trim(), tabArg };
      }
      const trailing = after[0];
      if (trailing && /^\d+(@\d+)?$/.test(trailing)) tabArg = trailing;
      return { action, index, tabArg };
    }
    if (rest.length === 1 && /^\d+(@\d+)?$/.test(rest[0]!)) {
      return { action: 'focus', index, tabArg: rest[0] };
    }
    if (rest.length > 0) {
      const textParts = [...rest];
      if (textParts.length > 1 && /^\d+(@\d+)?$/.test(textParts[textParts.length - 1]!)) {
        tabArg = textParts.pop();
      }
      return { action: 'fill', index, value: textParts.join(' ').trim(), tabArg };
    }
    return { action: 'focus', index, tabArg };
  }

  return { action: 'focus', tabArg };
}

export async function fetchPageInputs(
  tabId: number,
  ctx: ExecutionContext,
  pattern: string,
  limit: number
): Promise<PageInput[] | { error: string }> {
  const result = await runPageScript(tabId, ctx, 'listPageInputs', pattern, limit);
  if (isScriptError(result)) return result;
  return result as PageInput[];
}

export async function resolveInputAtIndex(
  ctx: ExecutionContext,
  tabId: number,
  index: number,
  pattern = ''
): Promise<{ input: PageInput } | { error: string }> {
  let list = !pattern ? ctx.getLastInputsResults?.() : undefined;
  if (!list?.length) {
    const fetched = await fetchPageInputs(tabId, ctx, pattern, 100);
    if (isScriptError(fetched)) return fetched;
    list = fetched;
    if (!pattern) ctx.setLastInputsResults?.(list);
  }
  const input = list[index - 1];
  if (!input) return { error: `Input #${index} not found. Run inputs first.` };
  return { input };
}

export async function runInputAction(
  parsed: ParsedInputArgs,
  ctx: ExecutionContext
): Promise<{ stdout?: string; stderr?: string; exitCode: number }> {
  const resolved = await resolvePageTab(parsed.tabArg ? [parsed.tabArg] : [], ctx);
  if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

  if (parsed.index === undefined) {
    return { stderr: error('Usage: input <#> | input <focus|fill|clear|show> <#> [text]'), exitCode: 2 };
  }

  if (parsed.action === 'show') {
    const item = await resolveInputAtIndex(ctx, resolved.ref.id, parsed.index);
    if (isScriptError(item)) return { stderr: error(item.error), exitCode: 1 };
    const i = item.input;
    return {
      stdout: [`#${parsed.index}`, i.label, i.type, i.name, i.placeholder].filter(Boolean).join('\n'),
      exitCode: 0,
    };
  }

  if (parsed.action === 'fill') {
    if (!parsed.value) return { stderr: error('Usage: input fill <#> <text>'), exitCode: 2 };
    const result = await runPageScript(resolved.ref.id, ctx, 'fillInputAtIndex', parsed.index, parsed.value, '');
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    const fill = result as { ok: boolean; label: string };
    if (!fill.ok) return { stderr: error(`Cannot fill input #${parsed.index}.`), exitCode: 1 };
    return { stdout: success(`Filled #${parsed.index} "${fill.label}"`), exitCode: 0 };
  }

  if (parsed.action === 'clear') {
    const result = await runPageScript(resolved.ref.id, ctx, 'clearInputAtIndex', parsed.index, '');
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    const cleared = result as { ok: boolean; label: string };
    if (!cleared.ok) return { stderr: error(`Cannot clear input #${parsed.index}.`), exitCode: 1 };
    return { stdout: success(`Cleared #${parsed.index} "${cleared.label}"`), exitCode: 0 };
  }

  const result = await runPageScript(resolved.ref.id, ctx, 'focusInputAtIndex', parsed.index, '');
  if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
  const focus = result as { ok: boolean; label: string };
  if (!focus.ok) return { stderr: error(`Input #${parsed.index} not found. Run inputs first.`), exitCode: 1 };
  return { stdout: success(`Focused #${parsed.index} "${focus.label}"`), exitCode: 0 };
}