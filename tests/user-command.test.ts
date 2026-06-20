import { describe, expect, it } from 'vitest';
import { userCmd } from '@/commands/utility/user';
import { DEFAULT_CONFIG } from '@/shared/storage';

describe('user command', () => {
  it('shows current username', async () => {
    const result = await userCmd.handler([], {
      env: { ...DEFAULT_CONFIG.env, USER: 'jamal' },
    } as never);
    expect(result.stdout).toBeTruthy();
    expect(result.exitCode).toBe(0);
  });

  it('sets username via user set', async () => {
    const result = await userCmd.handler(['set', 'jamal.dev'], {} as never);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('jamal.dev');
  });
});