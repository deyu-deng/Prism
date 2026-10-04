import { describe, it, expect } from 'vitest';
import { parseTaskSlices, calculateProgress } from './task-parser';

describe('parseTaskSlices', () => {
  it('parses standard TASK.md table', () => {
    const content = `
# TASK.md

| ID | Description | Status | Type | Notes |
|---|---|---|---|---|
| #1 | Setup project | Done | infra | - |
| #2 | Build UI | In Progress | feature | - |
| #3 | Write tests | Waiting for you | test | - |
    `.trim();

    const slices = parseTaskSlices(content);
    expect(slices).toHaveLength(3);
    expect(slices[0]).toEqual({ id: '#1', description: 'Setup project', status: 'Done', type: 'infra', notes: '-' });
    expect(slices[1]).toEqual({ id: '#2', description: 'Build UI', status: 'In Progress', type: 'feature', notes: '-' });
  });

  it('ignores separator and header rows', () => {
    const content = `
| ID | Description | Status |
|---|---|---|
| #1 | A | Done |
    `.trim();

    const slices = parseTaskSlices(content);
    expect(slices).toHaveLength(1);
    expect(slices[0].id).toBe('#1');
  });

  it('returns empty array for non-table content', () => {
    const slices = parseTaskSlices('Just some markdown text.');
    expect(slices).toHaveLength(0);
  });
});

describe('calculateProgress', () => {
  it('calculates 50% progress', () => {
    const slices = [
      { id: '1', description: '', status: 'Done', type: '', notes: '' },
      { id: '2', description: '', status: 'In Progress', type: '', notes: '' },
    ];
    const result = calculateProgress(slices);
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.pct).toBe(50);
  });

  it('returns 0 for empty slices', () => {
    const result = calculateProgress([]);
    expect(result.pct).toBe(0);
    expect(result.total).toBe(0);
  });
});
