import { useMemo } from 'react';
import {
  Rocket,
  Pause,
  Square,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Circle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useUIStore, type TaskItem } from '../../store/ui';
import type { HelmPhase } from '../../types/helm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExecutionProgressProps {
  sessionId: string | null;
  currentPhase: HelmPhase | null;
  activeSkills: string[];
  isExecuting: boolean;
  lastUpdate: Date | null;

  onViewOutput?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}

// ---------------------------------------------------------------------------
// Phase configuration
// ---------------------------------------------------------------------------

const PHASE_ORDER: HelmPhase[] = [
  'init',
  'explore',
  'recon',
  'grill',
  'design',
  'slice',
  'code',
  'test',
  'debug',
  'deploy',
];

const PHASE_LABELS: Record<HelmPhase, string> = {
  init: 'INIT',
  explore: 'EXPLORE',
  recon: 'RECON',
  grill: 'GRILL',
  design: 'DESIGN',
  slice: 'SLICE',
  code: 'CODE',
  test: 'TEST',
  debug: 'DEBUG',
  deploy: 'DEPLOY',
};

const PHASE_COLORS: Record<HelmPhase, string> = {
  init: 'text-gray-500 bg-gray-100 border-gray-300',
  explore: 'text-blue-600 bg-blue-50 border-blue-200',
  recon: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  grill: 'text-orange-600 bg-orange-50 border-orange-200',
  design: 'text-purple-600 bg-purple-50 border-purple-200',
  slice: 'text-pink-600 bg-pink-50 border-pink-200',
  code: 'text-green-600 bg-green-50 border-green-200',
  test: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  debug: 'text-red-600 bg-red-50 border-red-200',
  deploy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTaskIcon(status: TaskItem['status']) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />;
    case 'running':
      return <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-spin" />;
    case 'blocked':
      return <Circle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    default:
      return <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />;
  }
}

function formatDuration(startDate: Date | null): string {
  if (!startDate) return '--:--';
  const diff = Date.now() - startDate.getTime();
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExecutionProgress({
  sessionId,
  currentPhase,
  activeSkills,
  isExecuting,
  lastUpdate,
  onViewOutput,
  onPause,
  onStop,
}: ExecutionProgressProps) {
  const { tasks } = useUIStore();

  // Calculate progress metrics
  const progress = useMemo(() => {
    if (tasks.length === 0) return { percent: 0, done: 0, total: 0 };
    const done = tasks.filter((t) => t.status === 'done').length;
    return { percent: Math.round((done / tasks.length) * 100), done, total: tasks.length };
  }, [tasks]);

  // Determine phase index for progress visualization
  const currentPhaseIndex = currentPhase ? PHASE_ORDER.indexOf(currentPhase) : -1;

  // Don't render if not executing
  if (!isExecuting) return null;

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] animate-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Rocket className="w-4 h-4 text-[var(--accent-blue)]" />
            <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
              Execution Progress
            </span>
            {sessionId && (
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                Session: {sessionId.slice(0, 12)}...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                {isExecuting ? 'Running' : 'Paused'}
              </span>
            </div>
            <Clock className="w-3 h-3 text-[var(--text-muted)]" />
            <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
              {formatDuration(lastUpdate)}
            </span>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="mb-4">
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
            Phase Progress
          </span>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {PHASE_ORDER.map((phase, i) => {
              const isCompleted = currentPhaseIndex > i || (currentPhaseIndex === -1 && i === 0);
              const isCurrent = currentPhaseIndex === i;

              return (
                <div key={phase} className="flex items-center gap-1 shrink-0">
                  {/* Phase node */}
                  <div
                    className={`px-2 py-1 rounded-md border font-mono text-[9px] font-semibold uppercase transition-all ${
                      isCompleted
                        ? 'bg-green-50 text-green-700 border-green-300'
                        : isCurrent
                          ? `${PHASE_COLORS[phase]} ring-2 ring-offset-1 ring-[var(--accent-blue)]`
                          : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                    ) : null}
                    {PHASE_LABELS[phase]}
                  </div>

                  {/* Connector line */}
                  {i < PHASE_ORDER.length - 1 && (
                    <div
                      className={`w-6 h-px ${
                        currentPhaseIndex > i ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Skills */}
        {activeSkills.length > 0 && (
          <div className="mb-4">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
              Active Skills ({activeSkills.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {activeSkills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--bg-overlay)] border border-[var(--border-subtle)]"
                >
                  <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                  <span className="font-mono text-[10px] text-[var(--text-secondary)]">{skill}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task Progress Bar */}
        {tasks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                Task Progress
              </span>
              <span className="font-mono text-[10px] text-[var(--text-secondary)] tabular-nums">
                {progress.percent}% ({progress.done}/{progress.total} tasks)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Task List */}
        {tasks.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                    task.status === 'running'
                      ? 'bg-blue-50 border border-blue-200'
                      : task.status === 'done'
                        ? 'bg-transparent'
                        : 'bg-transparent'
                  }`}
                >
                  {getTaskIcon(task.status)}
                  <span
                    className={`font-mono text-[10px] truncate ${
                      task.status === 'running'
                        ? 'text-blue-700 font-medium'
                        : task.status === 'done'
                          ? 'text-[var(--text-muted)] line-through'
                          : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.status === 'running' && (
                    <span className="font-mono text-[9px] text-blue-500 ml-auto">(running...)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          {onViewOutput && (
            <button
              onClick={onViewOutput}
              className="font-mono text-[10px] px-3 py-1.5 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3 h-3" />
              View Live Output
            </button>
          )}
          {onPause && (
            <button
              onClick={onPause}
              className="font-mono text-[10px] px-3 py-1.5 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors inline-flex items-center gap-1.5"
            >
              <Pause className="w-3 h-3" />
              Pause
            </button>
          )}
          {onStop && (
            <button
              onClick={onStop}
              className="font-mono text-[10px] px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors inline-flex items-center gap-1.5"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
