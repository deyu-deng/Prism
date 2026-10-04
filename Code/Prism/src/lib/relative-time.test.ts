import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { relativeTime } from './relative-time';

describe('relativeTime', () => {
  const now = new Date('2026-05-27T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "刚刚" for times within 1 minute', () => {
    expect(relativeTime(new Date('2026-05-27T11:59:30.000Z'))).toBe('刚刚');
    expect(relativeTime(new Date('2026-05-27T12:00:00.000Z'))).toBe('刚刚');
  });

  it('returns "X 分钟前" for times within 1 hour', () => {
    expect(relativeTime(new Date('2026-05-27T11:58:00.000Z'))).toBe('2 分钟前');
    expect(relativeTime(new Date('2026-05-27T11:30:00.000Z'))).toBe('30 分钟前');
    expect(relativeTime(new Date('2026-05-27T11:01:00.000Z'))).toBe('59 分钟前');
  });

  it('returns "X 小时前" for times within 24 hours', () => {
    expect(relativeTime(new Date('2026-05-27T10:00:00.000Z'))).toBe('2 小时前');
    expect(relativeTime(new Date('2026-05-27T00:00:00.000Z'))).toBe('12 小时前');
  });

  it('returns "X 天前" for times beyond 24 hours', () => {
    expect(relativeTime(new Date('2026-05-26T12:00:00.000Z'))).toBe('1 天前');
    expect(relativeTime(new Date('2026-05-25T12:00:00.000Z'))).toBe('2 天前');
    expect(relativeTime(new Date('2026-05-20T12:00:00.000Z'))).toBe('7 天前');
  });

  it('accepts ISO string input', () => {
    expect(relativeTime('2026-05-27T11:58:00.000Z')).toBe('2 分钟前');
  });

  it('handles future dates gracefully', () => {
    expect(relativeTime(new Date('2026-05-27T12:01:00.000Z'))).toBe('刚刚');
  });
});
