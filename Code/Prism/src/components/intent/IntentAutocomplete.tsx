import { useEffect, useRef, useState } from 'react';
import { getCompletions, type IntentTemplate } from './intent-autocomplete-logic';
import { INTENT_ICONS } from '../../lib/icons';

interface IntentAutocompleteProps {
  input: string;
  isVisible: boolean;
  onSelect: (template: string) => void;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  feature: 'text-[var(--accent-teal)]',
  bugfix: 'text-[var(--accent-rose)]',
  explore: 'text-[var(--accent-blue)]',
  refactor: 'text-[var(--accent-amber)]',
};

const CATEGORY_LABELS: Record<string, string> = {
  feature: 'feature',
  bugfix: 'bugfix',
  explore: 'explore',
  refactor: 'refactor',
};

export function IntentAutocomplete({
  input,
  isVisible,
  onSelect,
  onClose,
}: IntentAutocompleteProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const completions: IntentTemplate[] = getCompletions(input);

  // Reset active index when completions change
  useEffect(() => {
    setActiveIndex(0);
  }, [completions.length, input]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(completions.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev === 0 ? Math.max(completions.length - 1, 0) : prev - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (completions[activeIndex]) {
          onSelect(completions[activeIndex].label);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isVisible, completions, activeIndex, onSelect, onClose]);

  if (!isVisible || completions.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xl overflow-hidden"
      role="listbox"
    >
      {completions.map((item, idx) => (
        <button
          key={item.label}
          role="option"
          aria-selected={idx === activeIndex}
          onClick={() => onSelect(item.label)}
          onMouseEnter={() => setActiveIndex(idx)}
          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
            idx === activeIndex ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span className="font-mono text-xs text-[var(--text-primary)] truncate flex items-center gap-2">
            {(() => {
              const catKey = item.category as keyof typeof INTENT_ICONS;
              const CatIcon = INTENT_ICONS[catKey];
              return CatIcon ? <CatIcon className="w-3 h-3 shrink-0" /> : null;
            })()}
            {item.label}
          </span>
          <span
            className={`font-mono text-[10px] ml-3 shrink-0 ${
              CATEGORY_COLORS[item.category] ?? 'text-[var(--text-secondary)]'
            }`}
          >
            {CATEGORY_LABELS[item.category] ?? item.category}
          </span>
        </button>
      ))}
    </div>
  );
}
