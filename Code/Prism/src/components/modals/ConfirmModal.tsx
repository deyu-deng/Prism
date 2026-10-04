import type { PrismQuestion } from '../../types/helm';

interface ConfirmModalProps {
  question: PrismQuestion;
  onAnswer: (answer: any) => void;
}

export function ConfirmModal({ question, onAnswer }: ConfirmModalProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">{question.title}</h2>
        {question.phase && (
          <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
            PHASE: {question.phase}
          </span>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-2">
        {question.options?.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onAnswer({ selected: opt.value || opt.label })}
            className={`px-4 py-2 rounded-md text-xs font-semibold border ${
              idx === question.options!.length - 1
                ? 'bg-[var(--accent-blue)] text-[var(--text-primary)] border-transparent hover:opacity-90'
                : 'bg-transparent border-[var(--border-default)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
