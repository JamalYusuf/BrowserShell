import { describe, expect, it } from 'vitest';
import { parseRc } from '@/shared/rc-parser';

describe('rc-parser', () => {
  it('parses bind and edit-bind directives', () => {
    const parsed = parseRc(`
bind f hints-current
bind <leader>e edit
edit-bind i insert-mode
`);
    expect(parsed.binds).toHaveLength(3);
    expect(parsed.binds[0]).toMatchObject({ keys: 'f', action: 'hints-current', scope: 'global' });
    expect(parsed.binds[1]?.keys).toBe('<leader>e');
    expect(parsed.binds[2]?.scope).toBe('editor');
  });

  it('parses bangs and aliases', () => {
    const parsed = parseRc(`
bang gh https://github.com/search?q=%s
alias ll='tabs --limit 20'
prompt = "\\u@\\h:\\w$ "
`);
    expect(parsed.bangs[0]).toMatchObject({ name: 'gh', url: 'https://github.com/search?q=%s' });
    expect(parsed.aliases.ll).toBe('tabs --limit 20');
    expect(parsed.settings.prompt).toContain('\\u');
  });

  it('parses workspace blocks', () => {
    const parsed = parseRc(`
workspace research:
  - left 60%:
    tabs: [linear.app, github.com]
`);
    expect(parsed.workspaces).toHaveLength(1);
    expect(parsed.workspaces[0]?.name).toBe('research');
    expect(parsed.workspaces[0]?.windows[0]?.tabs).toContain('linear.app');
  });
});