import { useState } from 'react';

export interface PrismQuestion {
  id: string;
  type: 'choice' | 'confirm' | 'input' | 'multi_select';
  phase?: string;
  title: string;
  options?: {
    label: string;
    detail?: string;
    input?: boolean;
    value?: any;
  }[];
}

interface DecisionPanelProps {
  question: PrismQuestion | null;
  onAnswer: (answer: any) => void;
  onClose: () => void;
}

export function DecisionPanel({ question, onAnswer, onClose }: DecisionPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedMulti, setSelectedMulti] = useState<Set<number>>(new Set());

  if (!question) return null;

  const handleSelect = (idx: number, opt: any) => {
    if (opt.input) {
      return; // wait for input submit
    }
    if (question.type === 'multi_select') {
      const newSet = new Set(selectedMulti);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      setSelectedMulti(newSet);
      return;
    }
    onAnswer({ selected: opt.value || opt.label });
  };

  const handleSubmitInput = () => {
    if (!inputValue.trim()) return;
    onAnswer({ input: inputValue });
  };

  const handleSubmitMulti = () => {
    const selected = Array.from(selectedMulti).map(idx => question.options![idx].value || question.options![idx].label);
    onAnswer({ selected });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-neutral-900/60 dark:bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-xl p-6 flex flex-col gap-5 w-[600px] max-w-[90vw] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{question.title}</h2>
          {question.phase && (
            <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">
              PHASE: {question.phase}
            </span>
          )}
        </div>

        {question.type === 'choice' && question.options && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx, opt)}
                className="flex flex-col text-left p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              >
                <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">{opt.label}</span>
                {opt.detail && <span className="text-xs text-neutral-500 mt-2 leading-relaxed">{opt.detail}</span>}
                {opt.input && (
                  <div className="mt-3 flex gap-2 w-full">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitInput()}
                      placeholder="Enter details..."
                      className="flex-1 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-xs py-1 focus:outline-hidden focus:border-violet-500"
                    />
                    <button onClick={(e) => { e.stopPropagation(); handleSubmitInput(); }} className="text-xs font-semibold text-violet-600">Submit</button>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {question.type === 'multi_select' && question.options && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {question.options.map((opt, idx) => {
                const isSelected = selectedMulti.has(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx, opt)}
                    className={`flex items-center gap-3 p-3 rounded-md border text-left transition-colors ${
                      isSelected 
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' 
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-neutral-400'}`}>
                      {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div>
                      <span className="font-medium text-sm block">{opt.label}</span>
                      {opt.detail && <span className="text-xs text-neutral-500 block mt-0.5">{opt.detail}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-4">
              <button 
                onClick={handleSubmitMulti}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-md text-xs font-semibold hover:opacity-90"
              >
                Confirm Selection
              </button>
            </div>
          </div>
        )}

        {question.type === 'confirm' && question.options && (
          <div className="flex justify-end gap-3 mt-2">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx, opt)}
                className={`px-4 py-2 rounded-md text-xs font-semibold border ${
                  idx === question.options!.length - 1 
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent hover:opacity-90' 
                    : 'bg-transparent border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {question.type === 'input' && (
          <div className="flex flex-col gap-3 mt-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full h-24 p-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-sm focus:outline-hidden focus:ring-1 focus:ring-violet-500 resize-none"
              placeholder="Enter your response..."
            />
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                Cancel
              </button>
              <button onClick={handleSubmitInput} className="px-4 py-2 rounded-md text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90">
                Submit
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
