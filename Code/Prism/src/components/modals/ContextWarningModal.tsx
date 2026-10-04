import { AlertTriangle, FileText } from 'lucide-react';

interface ContextWarningModalProps {
  usage: string;
  decisions: string[];
  onSaveADR: (decisions: string[]) => void;
  onSkip: () => void;
}

export function ContextWarningModal({ usage, decisions, onSaveADR, onSkip }: ContextWarningModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-[var(--bg-base)]/60 backdrop-blur-sm" />
      <div className="relative bg-[var(--bg-overlay)] border border-[var(--accent-amber)] shadow-2xl rounded-xl p-6 flex flex-col gap-5 w-[520px] max-w-[90vw] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--bg-surface)] rounded-full">
            <AlertTriangle className="w-5 h-5 text-[var(--accent-amber)]" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              上下文窗口即将满载
            </h3>
            <span className="font-mono text-[10px] text-[var(--accent-amber)]">
              使用率: {usage}
            </span>
          </div>
        </div>

        {decisions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              待确认决策
            </span>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {decisions.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  <span className="font-mono text-[11px] text-[var(--text-secondary)]">{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">
          建议将上述关键决策保存为 ADR 文档，避免上下文重置后决策丢失。
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onSkip}
            className="font-mono text-[10px] px-4 py-2 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            跳过（风险：决策可能丢失）
          </button>
          <button
            onClick={() => onSaveADR(decisions)}
            className="font-mono text-[10px] px-4 py-2 rounded-md bg-[var(--accent-amber)] text-[var(--text-primary)] hover:opacity-90 transition-colors"
          >
            写入 ADR 并保存
          </button>
        </div>
      </div>
    </div>
  );
}
