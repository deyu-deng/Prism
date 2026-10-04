import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdapterManager } from './AdapterManager';
import { GenericFileAdapter } from './GenericFileAdapter';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

describe('AdapterManager & GenericFileAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AdapterManager registers and retrieves adapters', () => {
    const manager = new AdapterManager();
    const adapter = manager.getAdapter('generic-file');
    expect(adapter).toBeDefined();
    expect(adapter?.name).toBe('Generic File Adapter');
  });

  it('GenericFileAdapter writes correctly formatted intent file', async () => {
    const adapter = new GenericFileAdapter();
    const projectRoot = '/mock/root';
    const intentType = 'Feature';
    const text = 'Add a new button';

    const fixedDate = new Date('2026-05-25T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);

    await adapter.dispatchIntent(intentType, text, projectRoot);

    expect(fs.mkdir).toHaveBeenCalledWith(path.join(projectRoot, '.ai'), { recursive: true });
    
    const expectedContent = `[[PRISM_QUESTION]]\nTYPE: Feature\nINTENT: Add a new button\nTIMESTAMP: 2026-05-25T12:00:00.000Z\n`;
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join(projectRoot, '.ai', 'prism-intent.md'),
      expectedContent,
      'utf-8'
    );

    vi.useRealTimers();
  });

  it('GenericFileAdapter correctly bubbles up EACCES from mkdir', async () => {
    const adapter = new GenericFileAdapter();
    vi.mocked(fs.mkdir).mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));
    await expect(adapter.dispatchIntent('Feature', 'Test', '/mock/root')).rejects.toThrow('Permission denied');
  });

  it('GenericFileAdapter correctly bubbles up ENOSPC from writeFile', async () => {
    const adapter = new GenericFileAdapter();
    vi.mocked(fs.writeFile).mockRejectedValueOnce(Object.assign(new Error('No space left'), { code: 'ENOSPC' }));
    await expect(adapter.dispatchIntent('Feature', 'Test', '/mock/root')).rejects.toThrow('No space left');
  });
});
