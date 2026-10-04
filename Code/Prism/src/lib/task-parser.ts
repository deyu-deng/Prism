export interface TaskSlice {
  id: string;
  description: string;
  status: string;
  type: string;
  notes: string;
}

/**
 * Parse task slices from a TASK.md Markdown table.
 * Expects rows like: | #1 | Description | Status | Type | Notes |
 */
export function parseTaskSlices(content: string): TaskSlice[] {
  const slices: TaskSlice[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    const data = cells.slice(1, -1);
    if (data.length < 2) continue;
    // Skip header separator rows (---)
    if (data[0].replace(/-/g, '').trim() === '') continue;
    // Only include rows that look like task IDs (start with # or T or numeric)
    if (!/^#?\d/.test(data[0]) && !/^T\d/.test(data[0])) continue;
    slices.push({
      id: data[0] ?? '',
      description: data[1] ?? '',
      status: data[2] ?? '',
      type: data[3] ?? '',
      notes: data[4] ?? '',
    });
  }
  return slices;
}

/**
 * Calculate progress stats from parsed task slices.
 */
export function calculateProgress(slices: TaskSlice[]): {
  total: number;
  completed: number;
  pct: number;
} {
  const total = slices.length;
  const completed = slices.filter(
    (s) =>
      s.status === 'Done' ||
      s.status === '完成' ||
      s.status.includes('✓')
  ).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pct };
}
