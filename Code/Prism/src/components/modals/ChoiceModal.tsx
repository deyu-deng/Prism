import { useState } from 'react';
import type { PrismQuestion } from '../../types/helm';

interface ChoiceModalProps {
  question: PrismQuestion;
  onAnswer: (answer: any) => void;
}

export function ChoiceModal({ question, onAnswer }: ChoiceModalProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSelect = (_idx: number, opt: any) => {
    if (opt.input) return;
    onAnswer({ selected: opt.value || opt.label });
  };

  const handleSubmitInput = () => {
    if (!inputValue.trim()) return;
    onAnswer({ input: inputValue });
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {question.options?.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx, opt)}
            className="flex flex-col text-left p-4 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent-blue)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <span className="font-semibold text-sm text-[var(--text-primary)]">{opt.label}</span>
            {opt.detail && (
              <span className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">{opt.detail}</span>
            )}
            {opt.input && (
              <div className="mt-3 flex gap-2 w-full">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitInput()}
                  placeholder="Enter details..."
                  className="flex-1 bg-transparent border-b border-[var(--border-default)] text-xs py-1 focus:outline-hidden focus:border-[var(--accent-blue)]"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleSubmitInput(); }}
                  className="text-xs font-semibold text-[var(--accent-blue)]"
                >
                  Submit
                </button>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
