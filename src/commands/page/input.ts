import { defineCommand } from '../define';
import { parseInputArgs, runInputAction } from '../shared/input-utils';
import { inputs } from './inputs';

export const input = defineCommand({
  name: 'input',
  description: 'List, focus, fill, or clear page inputs by number.',
  usage: 'input | input <#> [text] | input <#> <clear|show> | input <fill|clear|show> <#> [text]',
  examples: ['input', 'input 1', 'input 1 hello@mail.com', 'input fill 1 "query"', 'input 1 clear'],
  category: 'utility',
  seeAlso: ['inputs', 'fill', 'press', 'link'],
  notes: 'No args lists inputs. input <#> focuses. input <#> <text> fills. input 1 clear works either order.',
  handler: async (args, ctx) => {
    const parsed = parseInputArgs(args);
    if (parsed.index === undefined) {
      return inputs.handler(args, ctx);
    }
    return runInputAction(parsed, ctx);
  },
});