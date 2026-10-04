import React, { useMemo } from 'react';
import type { HelmDoc } from '../../types/helm';
import { parseTaskSlices, calculateProgress } from '../../lib/task-parser';
import { ListChecks, getStatusIcon } from '../../lib/icons';
import { Tooltip } from '../common/Tooltip';

function statusClasses(status: string): string {
  switch (status) {
    case 'ACTIVE':    return 'bg-[var(--bg-surface)] text-[var(--accent-blue)]';
    case 'LOCKED':    return 'bg-[var(--bg-surface)] text-[var(--text-muted)]';
    case 'PENDING':   return 'bg-[var(--bg-surface)] text-[var(--accent-amber)]';
    case 'EMPTY':     return 'bg-[var(--bg-surface)] text-[var(--text-muted)]';
    case 'STALE':     return 'bg-[var(--bg-surface)] text-[var(--text-muted)]';
    default:          return 'bg-[var(--bg-surface)] text-[var(--text-muted)]';
  }
}

interface TaskProgressCardProps {
  doc: HelmDoc;
  active: boolean;
  onClick: () => void;
}

export const TaskProgressCard = React.memo(function TaskProgressCard({ doc, active, onClick }: TaskProgressCardProps) {
  const { totalTasks, completedTasks, progressPct } = useMemo(() => {
    if (!doc.content) return { totalTasks: 0, completedTasks: 0, progressPct: 0 };
    const slices = parseTaskSlices(doc.content);
    const { total, completed, pct } = calculateProgress(slices);
    return { totalTasks: total, completedTasks: completed, progressPct: pct };
  }, [doc.content]);

  const StatusIcon = getStatusIcon(doc.status);

  return (
    <button
      onClick={onClick}
      disabled={doc.status === 'EMPTY'}
      className={`
        text-left flex flex-col gap-3 p-4 rounded-lg border transition-all group
        ${doc.status === 'EMPTY'
          ? 'opacity-40 grayscale cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-surface)]/30'
          : active
            ? 'bg-[var(--bg-surface)]/80 border-[var(--accent-blue)] shadow-sm ring-1 ring-[var(--accent-blue)]'
            : 'bg-[var(--bg-surface)] border-[var(--border-default)] hover:border-[var(--accent-blue)] shadow-xs'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <Tooltip content="任务进度">
          <ListChecks
            className={`w-4 h-4 transition-colors ${
              active ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'
            }`}
          />
        </Tooltip>
        <Tooltip content={`状态: ${doc.status}`}>
          <span className="flex items-center gap-1">
            <StatusIcon className="w-3 h-3" />
            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm font-medium ${statusClasses(doc.status)}`}>
              {doc.status}
            </span>
          </span>
        </Tooltip>
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className={`font-mono font-medium text-xs transition-colors ${
          active
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
        }`}>
          {doc.title}
        </h3>

        {totalTasks > 0 ? (
          <div className="mt-1.5 flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between font-mono text-[9px] text-[var(--text-muted)]">
              <span>{completedTasks} / {totalTasks} SLICES</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--border-default)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-teal)] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="font-mono text-[9px] text-[var(--text-muted)] truncate leading-relaxed">
            No tasks found.
          </p>
        )}
      </div>
    </button>
  );
});
