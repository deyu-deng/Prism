import { useState } from 'react';
import type { PrismQuestion } from '../../types/helm';

interface MultiSelectModalProps {
  question: PrismQuestion;
  onAnswer: (answer: any) => void;
}

export function MultiSelectModal({ question, onAnswer }: MultiSelectModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  const handleSubmit = () => {
    const values = Array.from(selected).map((idx) =>
      question.options![idx].value || question.options![idx].label
    );
    onAnswer({ selected: values });
  };

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

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          {question.options?.map((opt, idx) => {
            const isSelected = selected.has(idx);
            return (
              <button
                key={idx}
                onClick={() => toggle(idx)}
                className={`flex items-center gap-3 p-3 rounded-md border text-left transition-colors ${
                  isSelected
                    ? 'border-[var(--accent-blue)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-default)] hover:border-[var(--text-secondary)]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)]' : 'border-[var(--text-muted)]'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className="font-medium text-sm block">{opt.label}</span>
                  {opt.detail && <span className="text-xs text-[var(--text-muted)] block mt-0.5">{opt.detail}</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[var(--accent-blue)] text-[var(--text-primary)] rounded-md text-xs font-semibold hover:opacity-90"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
}
