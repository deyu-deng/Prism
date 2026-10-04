
import { IntentType } from '../../lib/intent-router';
import { INTENT_ICONS } from '../../lib/icons';

interface IntentPreviewProps {
  input: string;
  classification: string;
  isVisible: boolean;
}

interface ClassificationMeta {
  label: string;
  skill: string;
  phases: string;
  color: string;
}

const CLASSIFICATION_META: Record<string, ClassificationMeta> = {
  [IntentType.Feature]: {
    label: '新功能',
    skill: '/plobi-explore',
    phases: 'Phase 1 → Phase 7',
    color: 'text-[var(--accent-teal)]',
  },
  [IntentType.Bugfix]: {
    label: 'Bug 修复',
    skill: '/plobi-dissect',
    phases: 'Phase 1 → Phase 5',
    color: 'text-[var(--accent-rose)]',
  },
  [IntentType.Explore]: {
    label: '探索研究',
    skill: '/plobi-explore',
    phases: 'Phase 1 → Phase 3',
    color: 'text-[var(--accent-blue)]',
  },
  [IntentType.Refactor]: {
    label: '重构优化',
    skill: '/plobi-fuse',
    phases: 'Phase 2 → Phase 6',
    color: 'text-[var(--accent-amber)]',
  },
  [IntentType.Docs]: {
    label: '文档更新',
    skill: '/plobi-explore',
    phases: 'Phase 1 → Phase 2',
    color: 'text-[var(--text-secondary)]',
  },
};

export function IntentPreview({ input, classification, isVisible }: IntentPreviewProps) {
  if (!isVisible || !input.trim()) return null;

  const meta = CLASSIFICATION_META[classification] ?? CLASSIFICATION_META[IntentType.Feature];

  const intentKey = classification.toLowerCase() as keyof typeof INTENT_ICONS;
  const IntentIcon = INTENT_ICONS[intentKey] ?? INTENT_ICONS.feature;

  return (
    <div
      className="absolute top-full right-0 mt-1 z-40 pointer-events-none"
      style={{ animation: 'intentPreviewFadeIn 150ms ease-out' }}
    >
      <div className="flex items-center gap-3 px-3 h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg whitespace-nowrap">
        <IntentIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono text-[10px] text-[var(--text-secondary)]">分类：</span>
        <span className={`font-mono text-[10px] font-medium ${meta.color}`}>
          {meta.label}
        </span>
        <span className="text-[var(--border-default)]">|</span>
        <span className="font-mono text-[10px] text-[var(--text-secondary)]">触发：</span>
        <span className="font-mono text-[10px] text-[var(--accent-blue)]">{meta.skill}</span>
        <span className="text-[var(--border-default)]">|</span>
        <span className="font-mono text-[10px] text-[var(--text-secondary)]">预计阶段：</span>
        <span className="font-mono text-[10px] text-[var(--text-primary)]">{meta.phases}</span>
      </div>

      <style>{`
        @keyframes intentPreviewFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}