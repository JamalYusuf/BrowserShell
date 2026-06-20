export function truncateTitle(title: string, max = 40): string {
  return title.length > max ? title.slice(0, max - 1) + '…' : title;
}