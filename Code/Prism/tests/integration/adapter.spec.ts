import { describe, it, expect, vi } from 'vitest';
import { ClaudeCodeAdapter } from '../../electron/adapters/ClaudeCodeAdapter';
import { CursorAdapter } from '../../electron/adapters/cursor';
import { WindsurfAdapter } from '../../electron/adapters/windsurf';
import { AntigravityAdapter } from '../../electron/adapters/AntigravityAdapter';

vi.mock('child_process', () => ({
  exec: vi.fn((cmd: string, optsOrCb: any, maybeCb?: any) => {
    const cb = typeof optsOrCb === 'function' ? optsOrCb : maybeCb;
    if (cb) cb(new Error('command not found'), '', '');
  }),
}));

describe('IDEAdapter detect()', () => {
  it('ClaudeCodeAdapter detect requires projectRoot for fallback', async () => {
    const adapter = new ClaudeCodeAdapter();
    const result = await adapter.detect('/nonexistent');
    expect(typeof result).toBe('boolean');
    adapter.dispose?.();
  });

  it('CursorAdapter detect returns false for empty dir', async () => {
    const adapter = new CursorAdapter();
    const result = await adapter.detect('/nonexistent');
    expect(result).toBe(false);
    adapter.stopWatchOutput?.();
  });

  it('WindsurfAdapter detect returns false for empty dir', async () => {
    const adapter = new WindsurfAdapter();
    const result = await adapter.detect('/nonexistent');
    expect(result).toBe(false);
    adapter.stopWatchOutput?.();
  });

  it('AntigravityAdapter detect returns false for empty dir', async () => {
    const adapter = new AntigravityAdapter();
    const result = await adapter.detect('/nonexistent');
    expect(result).toBe(false);
    adapter.stopWatchOutput?.();
  });
});

describe('IDEAdapter injectSystemPrompt', () => {
  it('all adapters have injectSystemPrompt method', () => {
    expect(new ClaudeCodeAdapter().injectSystemPrompt).toBeDefined();
    expect(new CursorAdapter().injectSystemPrompt).toBeDefined();
    expect(new WindsurfAdapter().injectSystemPrompt).toBeDefined();
    expect(new AntigravityAdapter().injectSystemPrompt).toBeDefined();
  });
});
