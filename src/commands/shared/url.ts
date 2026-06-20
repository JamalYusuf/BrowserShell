export function tabDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function originFromUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (!u.protocol.startsWith('http')) return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
}

export function originFromHost(host: string): string | undefined {
  const trimmed = host.trim().replace(/^www\./, '');
  if (!trimmed || trimmed.includes(' ')) return undefined;
  if (trimmed.startsWith('http')) return originFromUrl(trimmed);
  return `https://${trimmed}`;
}