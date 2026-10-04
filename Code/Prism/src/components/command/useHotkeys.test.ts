// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHotkeys } from './useHotkeys';

// Helper: simulate keydown event on document
function fireKeydown(opts: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  target?: EventTarget;
}) {
  const event = new KeyboardEvent('keydown', {
    key: opts.key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    altKey: opts.altKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    bubbles: true,
  });
  if (opts.target && opts.target !== document) {
    (opts.target as HTMLElement).dispatchEvent(event);
  } else {
    document.dispatchEvent(event);
  }
}

describe('useHotkeys', () => {
  beforeEach(() => {
    // Clean up any focused elements
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  it('ctrl+k 触发对应 handler', () => {
    const handler = vi.fn();
    renderHook(() =>
      useHotkeys([{ key: 'ctrl+k', handler }])
    );
    act(() => {
      fireKeydown({ key: 'k', ctrlKey: true });
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('输入框聚焦时，allowInInput: false 不触发', () => {
    const handler = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() =>
      useHotkeys([{ key: 'ctrl+k', handler, allowInInput: false }])
    );
    act(() => {
      fireKeydown({ key: 'k', ctrlKey: true });
    });
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('ESC 在输入框聚焦时仍触发（allowInInput: true）', () => {
    const handler = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() =>
      useHotkeys([{ key: 'escape', handler, allowInInput: true }])
    );
    act(() => {
      fireKeydown({ key: 'Escape' });
    });
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it('enabled: false 时不触发', () => {
    const handler = vi.fn();
    renderHook(() =>
      useHotkeys([{ key: 'ctrl+k', handler, enabled: false }])
    );
    act(() => {
      fireKeydown({ key: 'k', ctrlKey: true });
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('多个快捷键同时注册互不干扰', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    renderHook(() =>
      useHotkeys([
        { key: 'ctrl+k', handler: h1 },
        { key: 'ctrl+o', handler: h2 },
      ])
    );
    act(() => {
      fireKeydown({ key: 'k', ctrlKey: true });
    });
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).not.toHaveBeenCalled();

    act(() => {
      fireKeydown({ key: 'o', ctrlKey: true });
    });
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('unmount 后不再触发', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useHotkeys([{ key: 'ctrl+k', handler }])
    );
    unmount();
    act(() => {
      fireKeydown({ key: 'k', ctrlKey: true });
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('textarea 聚焦时，allowInInput: false 不触发', () => {
    const handler = vi.fn();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    renderHook(() =>
      useHotkeys([{ key: 'ctrl+r', handler }])
    );
    act(() => {
      fireKeydown({ key: 'r', ctrlKey: true });
    });
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('ctrl+enter 配合 allowInInput: true 在输入框中也能触发', () => {
    const handler = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() =>
      useHotkeys([{ key: 'ctrl+enter', handler, allowInInput: true }])
    );
    act(() => {
      fireKeydown({ key: 'Enter', ctrlKey: true });
    });
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });
});
