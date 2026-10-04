// Re-export task parser for main-process usage.
// Source of truth lives in src/lib/task-parser.ts (shared pure logic).
export { parseTaskSlices, calculateProgress } from '../../src/lib/task-parser';
export type { TaskSlice } from '../../src/lib/task-parser';
