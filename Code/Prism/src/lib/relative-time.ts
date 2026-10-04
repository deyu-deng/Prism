/**
 * relativeTime — convert a date to a human-readable relative time string
 * Returns "刚刚" / "X 分钟前" / "X 小时前" / "X 天前"
 */
export function relativeTime(date: string | Date): string {
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - target.getTime();

  // Future dates → treat as "刚刚"
  if (diffMs < 0) return '刚刚';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return `${days} 天前`;
}
