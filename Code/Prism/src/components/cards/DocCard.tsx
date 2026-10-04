import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { HelmDoc } from '../../types/helm';
import { DocHoverPreview } from '../preview/DocHoverPreview';

// ---------------------------------------------------------------------------
// SVG Icon primitives — zero emoji
// ---------------------------------------------------------------------------

const DocIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const CliIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
  </svg>
);

const RuleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H9.75M8.25 21h8.25a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 16.5 3H8.25A2.25 2.25 0 0 0 6 5.25v13.5A2.25 2.25 0 0 0 8.25 21Z" />
  </svg>
);

function deriveIconType(title: string): 'doc' | 'cli' | 'rule' {
  const t = title.toUpperCase();
  if (t.includes('TASK') || t.includes('PROGRESS')) return 'cli';
  if (t.includes('DESIGN') || t.includes('ARCHITECTURE')) return 'rule';
  return 'doc';
}

function statusClasses(status: string): string {
  switch (status) {
    case 'RUNNING':   return 'bg-[var(--bg-surface)] text-[var(--accent-teal)]';
    case 'LOCKED':    return 'bg-[var(--bg-surface)] text-[var(--text-muted)]';
    case 'MINIMAL':   return 'bg-[var(--bg-surface)] text-[var(--accent-blue)]';
    case 'ACTIVE':    return 'bg-[var(--bg-surface)] text-[var(--accent-blue)]';
    case 'FROZEN':    return 'bg-[var(--bg-surface)] text-[var(--accent-blue)]';
    case 'HANDOFF':   return 'bg-[var(--bg-surface)] text-[var(--accent-amber)]';
    case 'DRAFT':     return 'bg-[var(--bg-surface)] text-[var(--text-muted)]';
    case 'GENERATED': return 'bg-[var(--bg-surface)] text-[var(--accent-amber)]';
    default:          return 'bg-[var(--bg-surface)] text-[var(--text-muted)]';
  }
}

// ---------------------------------------------------------------------------

interface DocCardProps {
  doc: HelmDoc;
  active: boolean;
  onClick: () => void;
  changed?: boolean;
}

export const DocCard = React.memo(function DocCard({ doc, active, onClick, changed = false }: DocCardProps) {
  const iconType = deriveIconType(doc.title);
  const Icon = iconType === 'cli' ? CliIcon : iconType === 'rule' ? RuleIcon : DocIcon;

  // Track whether we should show the highlight bar
  const [showHighlight, setShowHighlight] = useState(changed);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover preview state
  const [showPreview, setShowPreview] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (changed) {
      setShowHighlight(true);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setShowHighlight(false), 2000);
    }
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, [changed]);

  // Clean up preview timer on unmount
  useEffect(() => {
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    previewTimer.current = setTimeout(() => setShowPreview(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    setShowPreview(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        disabled={doc.status === 'EMPTY'}
        className={`
          relative text-left flex flex-col gap-3 p-4 rounded-lg border transition-all duration-150 group
          ${doc.status === 'EMPTY'
            ? 'opacity-40 grayscale cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-surface)]/30'
            : active
              ? 'bg-[var(--bg-surface)]/80 border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]'
              : 'bg-[var(--bg-surface)] border-[var(--border-default)] hover:border-[var(--accent-blue)] hover:-translate-y-px'
          }
        `}
      >
      {/* File change highlight bar */}
      {showHighlight && (
        <span
          className="doc-card-highlight"
          aria-hidden="true"
        />
      )}

      <div className="flex items-center justify-between">
        <Icon
          className={`w-4 h-4 transition-colors ${
            active ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'
          }`}
        />
        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm font-medium ${statusClasses(doc.status)}`}>
          {doc.status}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className={`font-mono font-medium text-xs transition-colors ${
          active
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
        }`}>
          {doc.title}
        </h3>
        <p className="font-mono text-[9px] text-[var(--text-muted)] truncate leading-relaxed">
          {doc.content.split('\n').find((l) => l.trim().startsWith('#') && !l.startsWith('##'))?.replace(/^#+\s*/, '') ?? '—'}
        </p>
      </div>
      </button>
      <DocHoverPreview
        doc={doc}
        position={mousePos}
        isVisible={showPreview}
      />
    </>
  );
});
