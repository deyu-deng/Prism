import { X, FileText, AlertCircle } from 'lucide-react';

interface MigrateSummaryModalProps {
  summary: {
    migrated: string[];
    manualReview: string[];
  };
  onClose: () => void;
}

export function MigrateSummaryModal({ summary, onClose }: MigrateSummaryModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-[var(--bg-base)]/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[var(--bg-overlay)] border border-[var(--border-default)] shadow-2xl rounded-xl p-6 flex flex-col gap-5 w-[560px] max-w-[90vw] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-sm font-semibold text-[var(--text-primary)]">
            Migration Summary
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {summary.migrated.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Successfully Migrated
            </span>
            <div className="flex flex-col gap-1.5">
              {summary.migrated.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                  <span className="font-mono text-[11px] text-[var(--text-secondary)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.manualReview.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent-amber)]">
              Needs Manual Review
            </span>
            <div className="flex flex-col gap-1.5">
              {summary.manualReview.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--accent-amber)]"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-[var(--accent-amber)]" />
                  <span className="font-mono text-[11px] text-[var(--text-secondary)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.migrated.length === 0 && summary.manualReview.length === 0 && (
          <p className="font-mono text-xs text-[var(--text-muted)] text-center py-4">
            No migration items detected. Project already follows Helm structure.
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="font-mono text-[10px] px-4 py-2 rounded-md bg-[var(--accent-blue)] text-[var(--text-primary)] hover:opacity-90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
