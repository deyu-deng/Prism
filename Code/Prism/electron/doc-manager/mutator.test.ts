import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMarkdownTableStatus, atomicUpdateTask } from './mutator';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn()
}));

describe('Mutator: updateMarkdownTableStatus', () => {
  const mockTable = `
# Progress

| ID | Description | Status | Type | Notes |
|----|-------------|--------|------|-------|
| #1 | First task  | Done   | Feat |       |
| #2 | Second task | Blocked| Bug  | Wait  |
| #3 | Third task  |        |      |       |
`;

  it('updates an existing status cell correctly while preserving spacing', () => {
    const updated = updateMarkdownTableStatus(mockTable, '#2', 'In Progress');
    expect(updated).toContain('| #2 | Second task | In Progress | Bug  | Wait  |');
    expect(updated).toContain('| #1 | First task  | Done   | Feat |       |'); // Unchanged
  });

  it('updates an empty status cell correctly', () => {
    const updated = updateMarkdownTableStatus(mockTable, '#3', 'Waiting');
    expect(updated).toContain('| #3 | Third task  | Waiting |      |       |');
  });

  it('throws an error if the slice ID is not found', () => {
    expect(() => updateMarkdownTableStatus(mockTable, '#99', 'Done')).toThrowError(/not found/);
  });
});

describe('Mutator: atomicUpdateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads, writes to tmp, and atomically renames', async () => {
    const mockContent = `| ID | Desc | Status |\n|---|---|---|\n| #1 | Task | Blocked |`;
    (fs.readFile as any).mockResolvedValue(mockContent);

    await atomicUpdateTask('/mock/root', '#1', 'Done');

    expect(fs.readFile).toHaveBeenCalledWith(path.join('/mock/root', 'TASK.md'), 'utf-8');
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('/mock/root', 'TASK.md.tmp'),
      expect.stringContaining('| #1 | Task | Done    |'),
      'utf-8'
    );
    expect(fs.rename).toHaveBeenCalledWith(
      path.join('/mock/root', 'TASK.md.tmp'),
      path.join('/mock/root', 'TASK.md')
    );
  });
});
