import { useState, useCallback } from 'react';
import { X, Copy, Check, ChevronDown, ChevronUp, HelpCircle, ExternalLink } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstallationStep {
  title: string;
  description: string;
  command?: string;
  verification?: string;
}

export interface InstallationGuideData {
  title: string;
  steps: InstallationStep[];
  documentationUrl?: string;
  troubleshooting?: Array<{
    problem: string;
    solution: string;
  }>;
}

interface InstallationGuideProps {
  guide: InstallationGuideData;
  onClose: () => void;
  onCommandCopied?: (command: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InstallationGuide({ guide, onClose, onCommandCopied }: InstallationGuideProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleCopy = useCallback(
    async (command: string, index: number) => {
      try {
        await navigator.clipboard.writeText(command);
      } catch {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = command;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedIndex(index);
      onCommandCopied?.(command);
      setTimeout(() => setCopiedIndex(null), 2000);
    },
    [onCommandCopied]
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--bg-base)]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative bg-[var(--bg-overlay)] border border-[var(--border-default)] shadow-2xl rounded-xl p-6 flex flex-col gap-5 w-[640px] max-w-[90vw] max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-full">
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              {guide.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Installation Steps ({guide.steps.length})
          </span>

          <div className="flex flex-col gap-3">
            {guide.steps.map((step, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
              >
                {/* Step header */}
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent-blue)] text-white font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                      {step.title}
                    </span>
                    <p className="font-mono text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Command block */}
                {step.command && (
                  <div className="ml-9 relative group">
                    <pre className="font-mono text-[11px] text-[var(--text-primary)] bg-[#1e1e2e] rounded-md p-3 pr-10 overflow-x-auto">
                      {step.command}
                    </pre>
                    <button
                      onClick={() => handleCopy(step.command!, i)}
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-[var(--bg-surface)]/90 hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy command"
                    >
                      {copiedIndex === i ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      )}
                    </button>
                  </div>
                )}

                {/* Verification command */}
                {step.verification && (
                  <div className="ml-9 flex items-start gap-2 p-2 rounded-md bg-green-50 border border-green-200">
                    <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] font-semibold text-green-700">
                        Verify:
                      </span>
                      <code className="font-mono text-[10px] text-green-800">
                        {step.verification}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Troubleshooting FAQ */}
        {guide.troubleshooting && guide.troubleshooting.length > 0 && (
          <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Troubleshooting
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {guide.troubleshooting.map((item, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[var(--border-subtle)] overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-surface)] transition-colors text-left"
                  >
                    <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                      {item.problem}
                    </span>
                    {expandedFaq === i ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    )}
                  </button>
                  {expandedFaq === i && (
                    <div className="px-3 pb-3 pt-0 border-t border-[var(--border-subtle)]">
                      <p className="font-mono text-[11px] text-[var(--text-secondary)] mt-2 leading-relaxed">
                        {item.solution}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation link */}
        {guide.documentationUrl && (
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <a
              href={guide.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-[var(--accent-blue)] hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View Full Documentation
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="font-mono text-[10px] px-4 py-2 rounded-md bg-[var(--accent-blue)] text-white hover:opacity-90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
