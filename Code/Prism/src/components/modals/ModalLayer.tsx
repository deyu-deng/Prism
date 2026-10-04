import type { PrismQuestion } from '../../types/helm';
import { ChoiceModal } from './ChoiceModal';
import { ConfirmModal } from './ConfirmModal';
import { InputModal } from './InputModal';
import { MultiSelectModal } from './MultiSelectModal';

interface ModalLayerProps {
  question: PrismQuestion | null;
  onAnswer: (answer: any) => void;
  onClose: () => void;
}

export function ModalLayer({ question, onAnswer, onClose }: ModalLayerProps) {
  if (!question) return null;

  const handleAnswer = (answer: any) => {
    onAnswer(answer);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div
        className="absolute inset-0 bg-[var(--bg-base)]/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      <div className="relative bg-[var(--bg-overlay)] border border-[var(--border-default)] shadow-2xl rounded-xl p-6 flex flex-col gap-5 w-[600px] max-w-[90vw] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        {question.type === 'choice' && (
          <ChoiceModal question={question} onAnswer={handleAnswer} />
        )}
        {question.type === 'confirm' && (
          <ConfirmModal question={question} onAnswer={handleAnswer} />
        )}
        {question.type === 'input' && (
          <InputModal question={question} onAnswer={handleAnswer} onClose={onClose} />
        )}
        {question.type === 'multi_select' && (
          <MultiSelectModal question={question} onAnswer={handleAnswer} />
        )}
      </div>
    </div>
  );
}
