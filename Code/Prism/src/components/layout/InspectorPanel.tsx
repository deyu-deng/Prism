import React, { useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, ClipboardCopy, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseTaskSlices } from "../../lib/task-parser";
import { getStatusIcon } from "../../lib/icons";
import { Tooltip } from "../common/Tooltip";
import { invoke } from "../../lib/ipc-client";

const TASK_STATUSES = ["Done", "In Progress", "Waiting for you", "Blocked"] as const;
type TaskStatusValue = (typeof TASK_STATUSES)[number];

function taskStatusBadgeClass(s: string): string {
  switch (s) {
    case "Done":            return "bg-[var(--bg-surface)] text-[var(--accent-teal)] border-[var(--accent-teal)]";
    case "In Progress":     return "bg-[var(--bg-surface)] text-[var(--accent-blue)] border-[var(--accent-blue)]";
    case "Waiting for you": return "bg-[var(--bg-surface)] text-[var(--accent-amber)] border-[var(--accent-amber)]";
    case "Blocked":         return "bg-[var(--bg-surface)] text-[var(--accent-rose)] border-[var(--accent-rose)]";
    default:                return "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-default)]";
  }
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

const MemoizedMarkdownViewer = React.memo(({ content }: { content: string }) => {
  return (
    <div className="prose prose-sm prose-neutral max-w-none
      prose-headings:font-mono prose-headings:tracking-tight prose-headings:text-[var(--text-primary)]
      prose-p:text-[var(--text-secondary)]
      prose-a:text-[var(--text-secondary)]
      prose-code:text-[var(--text-primary)] prose-code:bg-[var(--bg-base)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-medium
      prose-pre:bg-[var(--bg-base)] prose-pre:border prose-pre:border-[var(--border-default)]
      prose-blockquote:border-l-2 prose-blockquote:border-[var(--border-default)] prose-blockquote:text-[var(--text-muted)]
      prose-strong:font-semibold prose-strong:text-[var(--text-primary)]
      prose-ul:text-[var(--text-secondary)]
      prose-ol:text-[var(--text-secondary)]
      prose-li:marker:text-[var(--text-muted)]
      prose-table:border-collapse prose-table:w-full prose-table:text-sm
      prose-th:border prose-th:border-[var(--border-default)] prose-th:bg-[var(--bg-base)] prose-th:p-2 prose-th:text-left prose-th:font-medium prose-th:text-[var(--text-secondary)]
      prose-td:border prose-td:border-[var(--border-default)] prose-td:p-2 prose-td:text-[var(--text-secondary)]
      [&>ul>li>input[type='checkbox']]:mr-2 [&>ul>li>input[type='checkbox']]:mt-1 [&>ul>li>input[type='checkbox']]:accent-[var(--accent-blue)]"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

interface TaskStatusControllerProps {
  content: string;
  activeIde?: string;
  updatingTask?: string | null;
  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatusValue) => void;
  onOpenInIde?: (taskId?: string) => void;
}

const TaskStatusController = React.memo(({ content, activeIde, updatingTask, onUpdateTaskStatus, onOpenInIde }: TaskStatusControllerProps) => {
  const tasks = useMemo(() => parseTaskSlices(content), [content]);
  if (tasks.length === 0 || !onUpdateTaskStatus || !onOpenInIde) return null;

  return (
    <div className="border-t border-[var(--border-default)] px-4 py-3 flex flex-col gap-2 shrink-0 bg-[var(--bg-surface)]/60">
      <span className="font-mono text-[9px] text-[var(--text-secondary)] uppercase tracking-widest">
        TASK_STATUS_CONTROL
      </span>
      <div className="flex flex-col gap-1 overflow-y-auto max-h-48 scrollbar-hide">
        {tasks.map((task) => {
          const TaskStatusIcon = getStatusIcon(task.status === 'Done' ? 'ACTIVE' : task.status === 'In Progress' ? 'RUNNING' : task.status === 'Blocked' ? 'ERROR' : 'PENDING');
          return (
            <div key={task.id} className="flex items-center gap-2 py-1 border-b border-[var(--border-subtle)] last:border-0">
              <Tooltip content={task.status}>
                <TaskStatusIcon className="w-3 h-3 shrink-0" />
              </Tooltip>
              <span className="font-mono text-[9px] text-[var(--text-muted)] shrink-0 w-5">{task.id}</span>
              <span className="font-mono text-[10px] text-[var(--text-primary)] truncate flex-1 min-w-0">{task.description}</span>
              <Tooltip content={`Focus ${task.id} in ${activeIde}`}>
                <button
                  onClick={() => onOpenInIde(task.id)}
                  className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </Tooltip>
              <div className="flex gap-1 shrink-0 ml-auto">
                {TASK_STATUSES.map((s) => {
                  const isActive = task.status === s;
                  const isUpdating = updatingTask === task.id;
                  return (
                    <button
                      key={s}
                      disabled={isUpdating}
                      onClick={() => !isActive && onUpdateTaskStatus(task.id, s)}
                      className={`
                        font-mono text-[9px] px-2 py-0.5 rounded border transition-colors disabled:pointer-events-none
                        ${isActive
                          ? taskStatusBadgeClass(s)
                          : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
                        }
                        ${isUpdating ? "opacity-50 cursor-wait" : "opacity-100"}
                        ${!isActive && !isUpdating ? "cursor-pointer" : ""}
                      `}
                    >
                      {isUpdating && isActive ? "..." : s}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

interface InspectorPanelProps {
  isOpen: boolean;
  doc: any;
  activeIde?: string;
  projectRoot?: string;
  updatingTask?: string | null;
  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatusValue) => void;
  onOpenInIde?: (taskId?: string) => void;
  onClose: () => void;
}

export const InspectorPanel = React.memo(function InspectorPanel({ isOpen, doc, activeIde, projectRoot, updatingTask, onUpdateTaskStatus, onOpenInIde, onClose }: InspectorPanelProps) {
  // Use doc directly — no local useState copy to avoid extra render cycles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const StatusIcon = doc ? getStatusIcon(doc.status) : null;

  // Quick actions
  const filePath = doc?.filePath ?? (projectRoot ? `${projectRoot}/${doc?.title}` : doc?.title);

  const handleCopyPath = useCallback(async () => {
    if (filePath) {
      try {
        await navigator.clipboard.writeText(filePath);
      } catch {
        // Fallback: ignore in non-Electron environments
      }
    }
  }, [filePath]);

  const handleOpenInExplorer = useCallback(async () => {
    if (filePath) {
      try {
        await invoke('open_in_explorer', { filePath });
      } catch {
        // Fallback: ignore in non-Electron environments
      }
    }
  }, [filePath]);

  return (
    <AnimatePresence>
      {isOpen && doc && (
        <motion.div
          initial={{ x: 420 }}
          animate={{ x: 0 }}
          exit={{ x: 420 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-[420px] bg-[var(--bg-surface)] border-l border-[var(--border-default)] flex flex-col shrink-0 h-full"
        >
          {/* Header */}
          <div className="h-10 shrink-0 border-b border-[var(--border-default)] flex items-center px-4 justify-between bg-[var(--bg-surface)]/50">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-widest">
              {StatusIcon && (
                <Tooltip content={`状态: ${doc.status}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                </Tooltip>
              )}
              {doc.title} / INSPECTOR
            </span>
            <div className="flex items-center gap-2">
              {onOpenInIde && (
                <Tooltip content={`在 ${activeIde} 中打开此文件`}>
                  <button
                    onClick={() => onOpenInIde()}
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </Tooltip>
              )}
              <Tooltip content="关闭 Inspector (ESC)">
                <button
                  onClick={onClose}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Close Inspector"
                >
                  <X size={14} />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {doc.status === "EMPTY" ? (
              <div className="text-center py-20 text-[var(--text-secondary)] font-mono text-[10px]">
                <p>Document is empty or uninitialized.</p>
              </div>
            ) : (
              <MemoizedMarkdownViewer content={doc.content} />
            )}
          </div>

          {/* Task status control — TASK.md only */}
          {doc.title === "TASK.md" && (
            <TaskStatusController
              content={doc.content}
              activeIde={activeIde}
              updatingTask={updatingTask}
              onUpdateTaskStatus={onUpdateTaskStatus}
              onOpenInIde={onOpenInIde}
            />
          )}

          {/* Quick actions bar */}
          <div className="flex items-center gap-2 p-3 border-t border-[var(--border-default)] shrink-0 bg-[var(--bg-surface)]/60">
            <Tooltip content="复制文件路径">
              <button
                onClick={handleCopyPath}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors p-1 rounded border border-[var(--border-default)] bg-[var(--bg-surface)]"
              >
                <ClipboardCopy className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="在文件管理器中打开">
              <button
                onClick={handleOpenInExplorer}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors p-1 rounded border border-[var(--border-default)] bg-[var(--bg-surface)]"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="在 IDE 中编辑">
              <button
                onClick={() => onOpenInIde?.()}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors p-1 rounded border border-[var(--border-default)] bg-[var(--bg-surface)]"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});