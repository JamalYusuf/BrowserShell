import { loadConfig, saveConfig } from '@/shared/storage';

const AUDIT_KEY = 'AUDIT_LOG';

export async function appendAuditEntry(line: string): Promise<void> {
  const config = await loadConfig();
  const prev = config.env[AUDIT_KEY] ?? '';
  const stamp = new Date().toISOString();
  const entry = `[${stamp}] ${line}`;
  const next = prev ? `${prev}\n${entry}` : entry;
  const lines = next.split('\n').slice(-500);
  await saveConfig({ env: { ...config.env, [AUDIT_KEY]: lines.join('\n') } });
}

export async function readAuditLog(): Promise<string> {
  const config = await loadConfig();
  return config.env[AUDIT_KEY] ?? '';
}

export async function clearAuditLog(): Promise<void> {
  const config = await loadConfig();
  const { [AUDIT_KEY]: _removed, ...rest } = config.env;
  await saveConfig({ env: rest });
}