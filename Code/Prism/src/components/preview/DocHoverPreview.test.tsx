// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DocHoverPreview } from './DocHoverPreview';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('remark-gfm', () => ({
  default: () => {},
}));

describe('DocHoverPreview', () => {
  beforeEach(() => {
    // Clean up document.body portal remnants between tests
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
  });

  const baseDoc = {
    title: 'TASK.md',
    content: '# 任务进度\n\n一些内容',
    status: 'ACTIVE',
    lastModified: new Date(),
  };

  const basePosition = { x: 100, y: 100 };

  it('does not render when isVisible is false', () => {
    render(
      <DocHoverPreview doc={baseDoc} position={basePosition} isVisible={false} />
    );
    const bodyPreview = document.body.querySelector('[data-testid="doc-hover-preview"]');
    expect(bodyPreview).toBeNull();
  });

  it('renders title and content when isVisible is true', () => {
    render(
      <DocHoverPreview doc={baseDoc} position={basePosition} isVisible={true} />
    );
    const preview = document.body.querySelector('[data-testid="doc-hover-preview"]');
    expect(preview).not.toBeNull();
    expect(preview!.textContent).toContain('TASK.md');
    expect(preview!.textContent).toContain('任务进度');
  });

  it('truncates content exceeding 200 characters', () => {
    const longContent = 'A'.repeat(300);
    const doc = { ...baseDoc, content: longContent };
    render(
      <DocHoverPreview doc={doc} position={basePosition} isVisible={true} />
    );
    const preview = document.body.querySelector('[data-testid="doc-hover-preview"]');
    expect(preview).not.toBeNull();
    const contentEl = preview!.querySelector('[data-testid="preview-content"]');
    expect(contentEl).not.toBeNull();
    // Content truncated to 200 + '...' = 203 chars max
    const text = contentEl!.textContent || '';
    expect(text.length).toBeLessThanOrEqual(203);
  });

  it('displays relative time correctly', () => {
    // Use vi.useFakeTimers so relativeTime calculates from a controlled now
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'));

    const twoMinsAgo = new Date('2026-05-27T11:58:00.000Z');
    const doc = { ...baseDoc, lastModified: twoMinsAgo };
    render(
      <DocHoverPreview doc={doc} position={basePosition} isVisible={true} />
    );
    const timeEl = document.body.querySelector('[data-testid="preview-time"]');
    expect(timeEl).not.toBeNull();
    expect(timeEl!.textContent).toContain('2 分钟前');

    vi.useRealTimers();
  });

  it('does not render when doc is null', () => {
    render(
      <DocHoverPreview doc={null} position={basePosition} isVisible={true} />
    );
    const preview = document.body.querySelector('[data-testid="doc-hover-preview"]');
    expect(preview).toBeNull();
  });

  it('renders status tag with correct color class', () => {
    render(
      <DocHoverPreview doc={baseDoc} position={basePosition} isVisible={true} />
    );
    const statusEl = document.body.querySelector('[data-testid="preview-status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl!.textContent).toContain('ACTIVE');
  });

  it('positions itself relative to mouse coordinates', () => {
    render(
      <DocHoverPreview doc={baseDoc} position={{ x: 200, y: 150 }} isVisible={true} />
    );
    const preview = document.body.querySelector('[data-testid="doc-hover-preview"]') as HTMLElement;
    expect(preview).not.toBeNull();
    expect(preview.style.left).toBe('212px');
    expect(preview.style.top).toBe('158px');
  });

  it('flips to left when exceeding right boundary', () => {
    // jsdom default innerWidth = 1024, set to small value to force right overflow
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 300, configurable: true });

    render(
      <DocHoverPreview doc={baseDoc} position={{ x: 280, y: 100 }} isVisible={true} />
    );
    const preview = document.body.querySelector('[data-testid="doc-hover-preview"]') as HTMLElement;
    expect(preview).not.toBeNull();
    // Should use right positioning instead of left
    expect(preview.style.right).toBeTruthy();

    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
  });

  it('flips to top when exceeding bottom boundary', () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 200, configurable: true });

    render(
      <DocHoverPreview doc={baseDoc} position={{ x: 100, y: 180 }} isVisible={true} />
    );
    const preview = document.body.querySelector('[data-testid="doc-hover-preview"]') as HTMLElement;
    expect(preview).not.toBeNull();
    // Should use bottom positioning instead of top
    expect(preview.style.bottom).toBeTruthy();

    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true });
  });
});
