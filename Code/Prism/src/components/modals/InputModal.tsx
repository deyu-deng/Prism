import { useState } from 'react';
import type { PrismQuestion } from '../../types/helm';

interface InputModalProps {
  question: PrismQuestion;
  onAnswer: (answer: any) => void;
  onClose: () => void;
}

export function InputModal({ question, onAnswer, onClose }: InputModalProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
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

      <div className="flex flex-col gap-3 mt-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full h-24 p-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:outline-hidden focus:ring-1 focus:ring-[var(--accent-blue)] resize-none"
          placeholder="Enter your response..."
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-semibold border border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-md text-xs font-semibold bg-[var(--accent-blue)] text-[var(--text-primary)] hover:opacity-90"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
