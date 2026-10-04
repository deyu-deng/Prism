import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { relativeTime } from '../../lib/relative-time';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocHoverPreviewProps {
  doc: {
    title: string;
    content?: string;
    status: string;
    lastModified?: Date;
  } | null;
  position: { x: number; y: number };
  isVisible: boolean;
}

// ---------------------------------------------------------------------------
// Status color mapping
// ---------------------------------------------------------------------------

function statusColorClass(status: string): string {
  switch (status) {
    case 'ACTIVE':    return 'text-[var(--accent-blue)]';
    case 'RUNNING':   return 'text-[var(--accent-teal)]';
    case 'LOCKED':    return 'text-[var(--text-muted)]';
    case 'MINIMAL':   return 'text-[var(--accent-blue)]';
    case 'FROZEN':    return 'text-[var(--accent-blue)]';
    case 'HANDOFF':   return 'text-[var(--accent-amber)]';
    case 'DRAFT':     return 'text-[var(--text-muted)]';
    case 'GENERATED': return 'text-[var(--accent-amber)]';
    case 'STALE':     return 'text-[var(--accent-rose)]';
    case 'PENDING':   return 'text-[var(--accent-amber)]';
    case 'EMPTY':     return 'text-[var(--text-muted)]';
    default:          return 'text-[var(--text-muted)]';
  }
}

// ---------------------------------------------------------------------------
// Content truncation
// ---------------------------------------------------------------------------

const MAX_CONTENT_LENGTH = 200;

function truncateContent(content: string | undefined): string {
  if (!content) return '';
  if (content.length <= MAX_CONTENT_LENGTH) return content;
  return content.slice(0, MAX_CONTENT_LENGTH) + '...';
}

// ---------------------------------------------------------------------------
// Position calculation
// ---------------------------------------------------------------------------

const OFFSET_X = 12;
const OFFSET_Y = 8;
const PREVIEW_WIDTH = 280;
const PREVIEW_MAX_HEIGHT = 300;

function computePosition(mouse: { x: number; y: number }): React.CSSProperties {
  const exceedsRight = mouse.x + OFFSET_X + PREVIEW_WIDTH > window.innerWidth;
  const exceedsBottom = mouse.y + OFFSET_Y + PREVIEW_MAX_HEIGHT > window.innerHeight;

  if (exceedsRight && exceedsBottom) {
    return {
      right: `${window.innerWidth - mouse.x + OFFSET_X}px`,
      bottom: `${window.innerHeight - mouse.y + OFFSET_Y}px`,
    };
  }
  if (exceedsRight) {
    return {
      right: `${window.innerWidth - mouse.x + OFFSET_X}px`,
      top: `${mouse.y + OFFSET_Y}px`,
    };
  }
  if (exceedsBottom) {
    return {
      left: `${mouse.x + OFFSET_X}px`,
      bottom: `${window.innerHeight - mouse.y + OFFSET_Y}px`,
    };
  }
  return {
    left: `${mouse.x + OFFSET_X}px`,
    top: `${mouse.y + OFFSET_Y}px`,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocHoverPreview({ doc, position, isVisible }: DocHoverPreviewProps) {
  if (!doc || !isVisible) return null;

  const posStyle = useMemo(() => computePosition(position), [position.x, position.y]);
  const previewContent = useMemo(() => truncateContent(doc.content), [doc.content]);

  const portalContent = (
    <AnimatePresence>
      {isVisible && doc && (
        <motion.div
          data-testid="doc-hover-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            width: `${PREVIEW_WIDTH}px`,
            maxHeight: `${PREVIEW_MAX_HEIGHT}px`,
            overflow: 'hidden',
            zIndex: 10000,
            ...posStyle,
          }}
          className="pointer-events-none rounded-lg border bg-[var(--bg-overlay)] border-[var(--border-default)]"
          role="tooltip"
        >
          {/* Header: title + status */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <span className="font-mono text-xs font-medium text-[var(--text-primary)] truncate">
              {doc.title}
            </span>
            <span
              data-testid="preview-status"
              className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm font-medium ${statusColorClass(doc.status)}`}
            >
              {doc.status}
            </span>
          </div>

          {/* Divider */}
          <div className="border-b border-[var(--border-default)] mx-3" />

          {/* Markdown content */}
          <div
            data-testid="preview-content"
            className="px-3 py-2 text-[var(--text-secondary)] font-mono text-[10px] leading-relaxed overflow-hidden"
            style={{ maxHeight: '200px' }}
          >
            <div className="prose prose-sm prose-neutral max-w-none
              prose-headings:font-mono prose-headings:text-[var(--text-primary)]
              prose-p:text-[var(--text-secondary)]
              prose-code:text-[var(--text-primary)] prose-code:bg-[var(--bg-base)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm
              prose-table:text-[var(--text-secondary)]
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {previewContent}
              </ReactMarkdown>
            </div>
          </div>

          {/* Footer: last modified */}
          {doc.lastModified && (
            <div
              data-testid="preview-time"
              className="px-3 py-1.5 border-t border-[var(--border-subtle)] font-mono text-[9px] text-[var(--text-muted)]"
            >
              最后修改：{relativeTime(doc.lastModified)}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(portalContent, document.body);
}
