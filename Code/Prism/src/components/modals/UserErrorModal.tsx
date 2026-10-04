import { useState, useEffect, useCallback } from 'react';
import {
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  Copy,
  ExternalLink,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  GitBranch,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserFacingError {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestions: Array<{
    text: string;
    action?: {
      type: 'install' | 'configure' | 'retry' | 'open-url' | 'copy-command';
      payload?: string;
      label: string;
    };
  }>;
  technicalDetails?: string;
  documentationUrl?: string;
}

interface UserErrorModalProps {
  error: UserFacingError;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  error: {
    icon: AlertCircle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    border: 'border-red-300',
    bg: 'bg-red-50',
    label: 'ERROR',
    labelColor: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    border: 'border-yellow-300',
    bg: 'bg-yellow-50',
    label: 'WARNING',
    labelColor: 'text-yellow-600',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    label: 'INFO',
    labelColor: 'text-blue-600',
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserErrorModal({ error, onClose }: UserErrorModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const config = SEVERITY_CONFIG[error.severity];
  const IconComponent = config.icon;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && error.severity === 'info') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, error.severity]);

  // Copy command to clipboard
  const handleCopyCommand = useCallback(async (command: string, label: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCmd(label);
      setTimeout(() => setCopiedCmd(null), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = command;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedCmd(label);
      setTimeout(() => setCopiedCmd(null), 2000);
    }
  }, []);

  // Handle suggestion action
  const handleAction = useCallback(
    (action: NonNullable<UserFacingError['suggestions'][number]['action']>) => {
      switch (action.type) {
        case 'copy-command':
          if (action.payload) handleCopyCommand(action.payload, action.label);
          break;
        case 'open-url':
          if (action.payload) window.open(action.payload, '_blank');
          break;
        case 'retry':
        case 'install':
        case 'configure':
          onClose();
          break;
      }
    },
    [handleCopyCommand, onClose]
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--bg-base)]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={`relative bg-[var(--bg-overlay)] border ${config.border} shadow-2xl rounded-xl p-6 flex flex-col gap-5 w-[560px] max-w-[90vw] animate-in fade-in slide-in-from-bottom-4 duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${config.iconBg} rounded-full`}>
              <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                {error.title}
              </h3>
              <span className={`font-mono text-[10px] ${config.labelColor} uppercase tracking-wider`}>
                {config.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">
          {error.message}
        </p>

        {/* Suggestions */}
        {error.suggestions.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Suggestions
            </span>
            <div className="flex flex-col gap-2">
              {error.suggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 px-3 py-3 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-xs text-[var(--text-muted)] shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                      {suggestion.text}
                    </span>
                  </div>
                  {suggestion.action && (
                    <button
                      onClick={() => handleAction(suggestion.action!)}
                      className="ml-6 font-mono text-[10px] px-3 py-1.5 rounded-md bg-[var(--accent-blue)] text-white hover:opacity-90 transition-colors inline-flex items-center gap-1.5 w-fit"
                    >
                      {suggestion.action.type === 'copy-command' && (
                        <>
                          <Copy className="w-3 h-3" />
                          {copiedCmd === suggestion.action.label ? 'Copied!' : suggestion.action.label}
                        </>
                      )}
                      {suggestion.action.type === 'open-url' && (
                        <>
                          <ExternalLink className="w-3 h-3" />
                          {suggestion.action.label}
                        </>
                      )}
                      {suggestion.action.type === 'retry' && (
                        <>
                          <RotateCcw className="w-3 h-3" />
                          {suggestion.action.label}
                        </>
                      )}
                      {(suggestion.action.type === 'install' || suggestion.action.type === 'configure') && (
                        suggestion.action.label
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Details - Collapsible */}
        {error.technicalDetails && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors w-fit"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Technical Details (click to expand)
            </button>
            {showDetails && (
              <pre className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
                {error.technicalDetails}
              </pre>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
          {error.documentationUrl && (
            <a
              href={error.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-[var(--accent-blue)] hover:underline inline-flex items-center gap-1"
            >
              <GitBranch className="w-3 h-3" />
              Report Issue
            </a>
          )}
          <div className="flex gap-2 ml-auto">
            {error.severity !== 'info' && (
              <button
                onClick={onClose}
                className="font-mono text-[10px] px-4 py-2 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Dismiss
              </button>
            )}
            <button
              onClick={onClose}
              className="font-mono text-[10px] px-4 py-2 rounded-md bg-[var(--accent-blue)] text-white hover:opacity-90 transition-colors"
            >
              {error.severity === 'info' ? 'OK, I Understand' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
