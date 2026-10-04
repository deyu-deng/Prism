import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  invoke,
  onHelmDocChanged,
  onShowQuestionModal,
  onSessionCreated,
  onSessionPhaseChanged,
  onHelmViolationDetected,
  onContextWarning,
} from './lib/ipc-client';
import { InspectorPanel } from './components/layout/InspectorPanel';
import { Topbar } from './components/layout/Topbar';
import { ModalLayer } from './components/modals/ModalLayer';
import { MigrateSummaryModal } from './components/modals/MigrateSummaryModal';
import { ContextWarningModal } from './components/modals/ContextWarningModal';
import { ConsoleTray } from './components/layout/ConsoleTray';
import { DocCard } from './components/cards/DocCard';
import { TaskProgressCard } from './components/cards/TaskProgressCard';
import { classifyIntent, IntentType } from './lib/intent-router';
import { addRecentIntent } from './lib/state-persist';
import { useHelmDocsStore } from './store/helm-docs';
import { useUIStore } from './store/ui';
import { useSessionStore } from './store/session';
import type { HelmDoc } from './types/helm';
import { Search, Zap } from 'lucide-react';
import { useHotkeys } from './components/command/useHotkeys';
import { CommandPalette } from './components/command/CommandPalette';
import type { Command } from './components/command/CommandPalette';
import { prismBus } from './lib/event-bus';
// 新的插件系统组件
import { IdeSelectionWizard } from './components/plugins/IdeSelectionWizard';
import { UserErrorModal } from './components/modals/UserErrorModal';
import { ExecutionProgress } from './components/layout/ExecutionProgress';
import './App.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskStatusValue = 'Done' | 'In Progress' | 'Waiting for you' | 'Blocked';

// ---------------------------------------------------------------------------
// Sub-component: Spinner
// ---------------------------------------------------------------------------

const SpinnerIcon = () => (
  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 000 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
  </svg>
);

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

export default function App() {
  return <CommandCenter />;
}

// ---------------------------------------------------------------------------
// CommandCenter
// ---------------------------------------------------------------------------

function CommandCenter() {
  // Local business-logic state (not global UI state)
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [classifiedIntent, setClassifiedIntent] = useState<IntentType>(IntentType.Feature);
  const [manualIntent, setManualIntent] = useState<IntentType | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [activeIde, setActiveIde] = useState<string>(() => {
    return localStorage.getItem('prism_active_ide') || 'Cursor';
  });
  const [migrateSummary, setMigrateSummary] = useState<{ migrated: string[]; manualReview: string[] } | null>(null);
  const [contextWarning, setContextWarning] = useState<{ usage: string; decisions: string[] } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recentIntents, setRecentIntents] = useState<Array<{ text: string; classification: string; timestamp: string }>>([]);

  // Ref for intent input (for focus shortcut)
  const intentInputRef = useRef<HTMLInputElement>(null);

  // Debounce timer for rapid file-change events (watcher fires on every save)
  const docChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zustand global stores
  const { docs: helmDocs, selectedDocTitle, setDocs, updateDoc, selectDoc } = useHelmDocsStore();
  const {
    intentInput,
    isDeducing,
    modalQueue,
    setIntentInput,
    setIsDeducing,
    setInspectorOpen,
    enqueueModal,
    dequeueModal,
    // 插件系统相关状态
    wizardOpen,
    currentError,
    isExecuting,
    currentPhase,
    activeSkills,
    closeWizard,
    setCurrentError,
  } = useUIStore();

  const { sessions, activeSessionId, createSession, updateSessionPhase } = useSessionStore();

  // Logs remain local (tightly coupled to this window's console)
  const [logs, setLogs] = useState<string[]>([
    'PRISM.INIT: Ground system active.',
    'IO: Awaiting Helm/docs scan...',
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((...lines: string[]) => {
    setLogs((prev) => [...prev, ...lines]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ---------------------------------------------------------------------------
  // IDE control
  // ---------------------------------------------------------------------------

  const handleIdeChange = useCallback((ide: string) => {
    setActiveIde(ide);
    localStorage.setItem('prism_active_ide', ide);
    addLog(`SYS: Navigation target switched to ${ide}.`);
    if (projectRoot) {
      invoke('set_active_ide', { ideName: ide, projectRoot }).catch((err) => console.error(err));
    }
    invoke('save_persisted_state', { lastIde: ide }).catch(() => { });
  }, [projectRoot, addLog]);

  const handleOpenInIde = useCallback((taskId?: string) => {
    if (!selectedDocTitle || !projectRoot) return;
    addLog(
      `SYS: Dispatching launch command to ${activeIde} for ${selectedDocTitle}${taskId ? ` at ${taskId}` : ''}...`
    );
    invoke<string>('open_in_ide', {
      ideName: activeIde,
      fileName: selectedDocTitle,
      taskId: taskId || null,
      projectRoot,
    })
      .then((msg) => addLog(`SYS: ${msg}`))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`$> IO.ERROR: IDE launch failed — ${msg}`);
      });
  }, [selectedDocTitle, projectRoot, activeIde, addLog]);

  // ---------------------------------------------------------------------------
  // Refresh docs
  // ---------------------------------------------------------------------------

  const refreshDocs = useCallback(
    (dir: string, selectTitle?: string) => {
      setLoading(true);
      return invoke<HelmDoc[]>('scan_helm_docs', { projectRoot: dir })
        .then((docs) => {
          setDocs(docs);
          const target = selectTitle
            ? docs.find((d) => d.title === selectTitle)?.title ?? docs[0]?.title ?? null
            : (docs[0]?.title ?? null);
          selectDoc(target);
          const existingDocs = docs.filter((d) => d.status !== 'EMPTY').length;
          addLog(`SYSTEM: 已扫描项目，发现 ${existingDocs} 个现有文档`);

          // Auto-inject System Prompt after scan (Slice B)
          const contextDoc = docs.find((d) => d.title === 'CONTEXT.md');
          const taskDoc = docs.find((d) => d.title === 'TASK.md');
          invoke('inject_system_prompt', {
            projectRoot: dir,
            phase: 'explore',
            taskType: 'feature',
            contextSummary: contextDoc?.content?.trim().slice(0, 300) || 'No context available yet.',
            taskSummary: taskDoc?.content?.trim().slice(0, 300) || 'No tasks defined yet.',
          })
            .then(() => addLog('SYSTEM: Helm System Prompt injected into CLAUDE.md'))
            .catch((err: any) => {
              const msg = err instanceof Error ? err.message : String(err);
              addLog(`$> IO.ERROR: System Prompt injection failed — ${msg}`);
            });

          setLoading(false);
          return docs;
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          setLoading(false);
          addLog(`$> IO.ERROR: scan_helm_docs failed — ${msg}`);
          return [];
        });
    },
    [setDocs, selectDoc, addLog]
  );

  const handleOpenProject = useCallback(async () => {
    try {
      const dir = await invoke<string | null>('select_project_dir');
      if (dir) {
        setProjectRoot(dir);
        invoke('set_active_ide', { ideName: activeIde, projectRoot: dir }).catch((err) => console.error(err));
        addLog(`IO.SCAN: Selected project root: ${dir}`, 'IO: Awaiting Helm/docs scan...');
        refreshDocs(dir);
        invoke('save_persisted_state', { lastProject: dir }).catch(() => { });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`$> IO.ERROR: select_project_dir failed — ${msg}`);
    }
  }, [activeIde, refreshDocs, addLog]);

  // ---------------------------------------------------------------------------
  // Mount & Watcher
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setLoading(false);
    // Restore persisted state on mount
    invoke<{ lastProject: string; lastIde: string; recentIntents?: Array<{ text: string; classification: string; timestamp: string }> }>('get_persisted_state')
      .then((state) => {
        if (state?.lastProject) {
          setProjectRoot(state.lastProject);
          refreshDocs(state.lastProject);
        }
        if (state?.lastIde) {
          setActiveIde(state.lastIde);
          localStorage.setItem('prism_active_ide', state.lastIde);
        }
        if (state?.recentIntents) {
          setRecentIntents(state.recentIntents);
        }
      })
      .catch(() => {
        // Silently ignore — persisted state is optional
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribeDoc = onHelmDocChanged((updatedDoc: any) => {
      // Debounce: if the same doc updates rapidly (e.g. IDE auto-save),
      // only process the trailing edge to avoid re-render storms
      if (docChangeTimer.current) clearTimeout(docChangeTimer.current);
      docChangeTimer.current = setTimeout(() => {
        updateDoc(updatedDoc.title, {
          status: updatedDoc.status,
          content: updatedDoc.content,
        });
        addLog(`IO.WATCH: Detected change in ${updatedDoc.title} -> Status: ${updatedDoc.status}`);
        docChangeTimer.current = null;
      }, 200);
    });

    const unsubscribeQuestion = onShowQuestionModal((data: any) => {
      enqueueModal(data);
      addLog(`IO.WATCH: Received question from IDE -> [${data.type}] ${data.title}`);
    });

    const unsubscribeSessionCreated = onSessionCreated((data: any) => {
      createSession({
        id: data.sessionId,
        ideSessionId: data.sessionId,
        workflowPhase: 'explore',
        taskType: data.intentType || 'feature',
        projectRoot: projectRoot || '',
        windowId: 0,
      });
      addLog(`IO.SESSION: Created session ${data.sessionId} [${data.intentType}]`);
    });

    const unsubscribePhaseChanged = onSessionPhaseChanged((data: any) => {
      if (activeSessionId && data.phase) {
        updateSessionPhase(activeSessionId, data.phase);
        addLog(`IO.PHASE: Workflow transitioned -> ${data.phase}`);
      }
    });

    const unsubscribeViolation = onHelmViolationDetected((data: any) => {
      for (const v of data.violations || []) {
        const prefix = v.severity === 'block' ? 'HELM [BLOCK]' : 'HELM [WARN]';
        addLog(`${prefix}: ${v.message}`);
      }
    });

    const unsubscribeContextWarning = onContextWarning((data: any) => {
      setContextWarning({ usage: data.usage, decisions: data.decisions || [] });
      addLog(`HELM [WARN]: Context window near capacity — ${data.usage}`);
    });

    return () => {
      if (docChangeTimer.current) clearTimeout(docChangeTimer.current);
      unsubscribeDoc?.();
      unsubscribeQuestion?.();
      unsubscribeSessionCreated?.();
      unsubscribePhaseChanged?.();
      unsubscribeViolation?.();
      unsubscribeContextWarning?.();
    };
  }, [updateDoc, addLog, enqueueModal, createSession, updateSessionPhase, activeSessionId, projectRoot]);

  // ---------------------------------------------------------------------------
  // Intent submit & classification
  // ---------------------------------------------------------------------------

  const handleIntentChange = useCallback(
    (val: string) => {
      setIntentInput(val);
      if (!manualIntent) {
        setClassifiedIntent(classifyIntent(val));
      }
    },
    [manualIntent, setIntentInput]
  );

  const handleIntentSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const submittedIntent = intentInput.trim();
      if (!submittedIntent) return;

      const type = classifiedIntent;
      addLog(`IO.INTENT: Captured "${submittedIntent}", Classified as: [${type}]`);

      setIsDeducing(true);
      setTimeout(() => setIsDeducing(false), 2000);

      if (projectRoot) {
        invoke<void>('dispatch_intent', {
          intentType: type,
          text: submittedIntent,
          projectRoot,
        })
          .then(() => addLog(`IO.DISPATCH: Intent routed to ${activeIde} via .ai/prism-intent.md`))
          .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            addLog(`$> IO.ERROR: Intent dispatch failed — ${msg}`);
          });
      } else {
        addLog(`$> IO.ERROR: No project selected. Cannot dispatch intent.`);
      }

      setIntentInput('');
      setManualIntent(null);
      setClassifiedIntent(IntentType.Feature);

      // Persist recent intent (get current state, append, save back)
      invoke<import('./lib/state-persist').PersistedState>('get_persisted_state')
        .then((state) => {
          const updated = addRecentIntent(state, submittedIntent, type);
          setRecentIntents(updated.recentIntents);
          return invoke('save_persisted_state', { recentIntents: updated.recentIntents });
        })
        .catch(() => { });
    },
    [intentInput, classifiedIntent, projectRoot, activeIde, setIntentInput, setIsDeducing, addLog]
  );

  // ---------------------------------------------------------------------------
  // Decision Commit logic
  // ---------------------------------------------------------------------------

  const currentQuestion = modalQueue[0] ?? null;

  // 处理插件选择
  const handleSelectPlugin = useCallback(
    async (pluginId: string) => {
      if (!projectRoot) return { success: false };
      try {
        const result = await invoke<{ success: boolean; error?: string }>('set_active_plugin', { pluginId, projectRoot });
        if (result.success) {
          setActiveIde(pluginId);
          closeWizard();
          return { success: true };
        }
        return { success: false, error: result.error || 'Failed to set plugin' };
      } catch (error: any) {
        console.error('[App] Failed to select plugin:', error);
        return { success: false, error: error.message };
      }
    },
    [projectRoot, setActiveIde, closeWizard]
  );

  const handleAnswerQuestion = useCallback(
    (answer: any) => {
      if (!currentQuestion || !projectRoot) return;
      invoke('answer_question', {
        questionId: currentQuestion.id,
        answer,
        projectRoot,
      })
        .then(() => addLog(`IO.DISPATCH: Answer sent to IDE for question ${currentQuestion.id}`))
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          addLog(`$> IO.ERROR: Failed to answer question — ${msg}`);
        });
      dequeueModal();
    },
    [currentQuestion, projectRoot, addLog, dequeueModal]
  );

  // ---------------------------------------------------------------------------
  // Project Initialization (Zero State)
  // ---------------------------------------------------------------------------

  const handleInitializeProject = useCallback(async () => {
    if (!projectRoot) return;
    addLog(`$> IO.INIT: Initializing Helm workspace at ${projectRoot}...`);

    try {
      // Attempt migration first if README.md or TODO.md exists
      const migrateResult = await invoke<{ success: boolean; migrated: string[]; manualReview: string[] }>(
        'migrate_project',
        { projectRoot }
      );
      if (migrateResult.migrated.length > 0 || migrateResult.manualReview.length > 0) {
        setMigrateSummary({ migrated: migrateResult.migrated, manualReview: migrateResult.manualReview });
        addLog(`$> INFO: Migration detected — ${migrateResult.migrated.length} files migrated`);
      }

      const result = await invoke<{ success: boolean; created: string[] }>('initialize_project', { projectRoot });
      addLog(`$> OK: Workspace initialized — ${result.created.length} documents created`);
      result.created.forEach((f) => addLog(`  → ${f}`));

      // Refresh docs grid
      await refreshDocs(projectRoot);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`$> IO.ERROR: initialize_project failed — ${msg}`);
    }
  }, [projectRoot, addLog, refreshDocs]);

  // ---------------------------------------------------------------------------
  // Task status mutation
  // ---------------------------------------------------------------------------

  const handleUpdateTaskStatus = useCallback(
    (taskId: string, newStatus: TaskStatusValue) => {
      if (!selectedDocTitle || updatingTask || !projectRoot) return;
      setUpdatingTask(taskId);
      addLog(`$> IO.WRITE: Atomic patch slice [${taskId}] to [${newStatus}]`);

      invoke<void>('update_task_status', {
        projectRoot,
        sliceId: taskId,
        newStatus,
      })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          addLog(`$> IO.ERROR: update_task_status failed — ${msg}`);
        })
        .finally(() => setUpdatingTask(null));
    },
    [selectedDocTitle, updatingTask, projectRoot, addLog]
  );

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  const selectedDoc = helmDocs.find((d) => d.title === selectedDocTitle) ?? null;

  const handleSelectCard = useCallback(
    (title: string) => {
      if (title === selectedDocTitle) {
        selectDoc(null);
        setInspectorOpen(false);
      } else {
        selectDoc(title);
        setInspectorOpen(true);
      }
    },
    [selectedDocTitle, selectDoc, setInspectorOpen]
  );

  // ---------------------------------------------------------------------------
  // Workflow phase derived from active session
  // ---------------------------------------------------------------------------
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const workflowPhase = activeSession?.workflowPhase ?? null;

  // ---------------------------------------------------------------------------
  // Command Palette & Hotkeys
  // ---------------------------------------------------------------------------

  const commands: Command[] = [
    {
      id: 'open-project',
      label: '打开项目...',
      category: 'action',
      shortcut: 'Ctrl+O',
      handler: handleOpenProject,
    },
    {
      id: 'refresh-docs',
      label: '刷新文档状态',
      category: 'action',
      shortcut: 'Ctrl+R',
      handler: () => { if (projectRoot) refreshDocs(projectRoot); },
    },
    {
      id: 'focus-intent',
      label: '聚焦意图输入框',
      category: 'action',
      shortcut: 'Ctrl+I',
      handler: () => intentInputRef.current?.focus(),
    },
    // 文档快速打开（Ctrl+1 ~ Ctrl+7）
    ...helmDocs.map((doc, i) => ({
      id: `doc-${doc.title}`,
      label: `打开 ${doc.title}`,
      category: 'document' as const,
      shortcut: i < 7 ? `Ctrl+${i + 1}` : undefined,
      handler: () => handleSelectCard(doc.title),
    })),
    // IDE 切换
    ...['ClaudeExtension', 'ClaudeTerminal', 'Cursor', 'Windsurf', 'Antigravity'].map((ide) => ({
      id: `ide-${ide}`,
      label: `切换到 ${ide}`,
      category: 'ide' as const,
      handler: () => handleIdeChange(ide),
    })),
  ];

  useHotkeys([
    { key: 'ctrl+k', handler: () => { setPaletteOpen(true); prismBus.emit('command:open-palette'); } },
    {
      key: 'escape',
      handler: () => { setPaletteOpen(false); selectDoc(null); setInspectorOpen(false); },
      allowInInput: true,
    },
    { key: 'ctrl+o', handler: handleOpenProject },
    { key: 'ctrl+r', handler: () => { if (projectRoot) refreshDocs(projectRoot); } },
    { key: 'ctrl+i', handler: () => intentInputRef.current?.focus() },
    { key: 'ctrl+enter', handler: () => handleIntentSubmit(), allowInInput: true },
    // Ctrl+1 ~ Ctrl+7 选择卡片
    ...helmDocs.slice(0, 7).map((doc, i) => ({
      key: `ctrl+${i + 1}`,
      handler: () => handleSelectCard(doc.title),
    })),
  ]);


  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasProject = !!projectRoot;
  const allEmpty = hasProject && helmDocs.length > 0 && helmDocs.every((c) => c.status === 'EMPTY');
  const showGrid = hasProject && helmDocs.length > 0 && !allEmpty;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] font-sans overflow-hidden selection:bg-[var(--bg-hover)]">
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <Topbar
        workflowPhase={workflowPhase}
        intent={intentInput}
        onIntentChange={handleIntentChange}
        onIntentSubmit={handleIntentSubmit}
        activeIde={activeIde}
        onIdeChange={handleIdeChange}
        onOpenProject={handleOpenProject}
        classifiedIntent={classifiedIntent}
        recentIntents={recentIntents}
        inputRef={intentInputRef}
      />

      {/* ── Main workspace ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left: Grid Viewport */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4">
          {/* Section label */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
                本地物理规约
              </span>
              <span className="font-mono text-[10px] text-[var(--border-subtle)]">//</span>
              <span className="font-mono text-[10px] text-[var(--text-secondary)] truncate max-w-64">
                {projectRoot ? projectRoot : 'NO_PROJECT_LOADED'} / Code / Helm / docs
              </span>
            </div>
            {loading && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--text-secondary)]">
                <SpinnerIcon />
                SCANNING
              </span>
            )}
          </div>

          {/* Empty state & Zero State */}
          {!loading && !projectRoot && (
            <div className="border border-dashed border-[var(--border-default)] rounded-lg p-12 text-center">
              <p className="font-mono text-xs text-[var(--text-secondary)]">
                Awaiting Project Load... Use [打开项目...] to select workspace root.
              </p>
            </div>
          )}

          {!loading && allEmpty && (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="p-4 bg-[var(--bg-surface)] rounded-full mb-6">
                <Search className="w-8 h-8 text-[var(--text-secondary)]" />
              </div>
              <h2 className="font-mono text-lg font-semibold text-[var(--text-primary)] mb-2">
                Workspace Uninitialized
              </h2>
              <p className="font-mono text-xs text-[var(--text-muted)] text-center max-w-md leading-relaxed mb-8">
                No Helm documents were detected in this project. Prism requires a standard physical workspace to operate. Click below to command your IDE to scan the codebase and automatically generate the architecture and progress documents.
              </p>
              <button
                onClick={handleInitializeProject}
                className="font-mono text-xs px-6 py-2.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                [Scan & Initialize Project]
              </button>
            </div>
          )}

          {!loading && hasProject && helmDocs.length === 0 && (
            <div className="border border-dashed border-[var(--border-default)] rounded-lg p-12 text-center">
              <p className="font-mono text-xs text-[var(--text-secondary)]">
                ERR: No spec files loaded. Verify Helm/docs path is accessible.
              </p>
            </div>
          )}

          {/* Card grid */}
          {showGrid && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {helmDocs.map((doc) => {
                const active = selectedDocTitle === doc.title;
                if (doc.title === 'TASK.md') {
                  return (
                    <TaskProgressCard
                      key={doc.title}
                      doc={doc}
                      active={active}
                      onClick={() => handleSelectCard(doc.title)}
                    />
                  );
                }
                return (
                  <DocCard
                    key={doc.title}
                    doc={doc}
                    active={active}
                    onClick={() => handleSelectCard(doc.title)}
                  />
                );
              })}
            </div>
          )}
        </main>

        {/* Right Pane: Inspector */}
        <InspectorPanel
          isOpen={!!selectedDoc && selectedDoc.status !== 'EMPTY'}
          doc={selectedDoc}
          activeIde={activeIde}
          updatingTask={updatingTask}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          onOpenInIde={handleOpenInIde}
          onClose={() => {
            selectDoc(null);
            setInspectorOpen(false);
          }}
        />
      </div>

      {/* ── Console Log Tray ────────────────────────────────────────────────── */}
      <ConsoleTray logs={logs} />

      {/* ── Silent Deduction Overlay ────────────────────────────────────────── */}
      {isDeducing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-[var(--bg-base)]/40 backdrop-blur-[2px] transition-opacity" />
          <div className="relative bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl rounded-xl px-10 py-8 flex flex-col items-center gap-5 translate-y-[-20px] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <SpinnerIcon />
            <div className="font-mono text-xs text-center flex flex-col gap-1.5">
              <span className="text-[var(--text-primary)] font-semibold">
                SYSTEM: Analyzing intent "{intentInput || '...'}"
              </span>
              <span className="text-[var(--accent-blue)] font-bold">
                → routing to{' '}
                {classifiedIntent === IntentType.Feature
                  ? '/plobi-explore'
                  : classifiedIntent === IntentType.Bugfix
                    ? '/plobi-dissect'
                    : classifiedIntent === IntentType.Refactor
                      ? '/plobi-fuse'
                      : '/plobi-explore'}
              </span>
              <span className="text-[var(--text-secondary)] mt-2">Loading CONTEXT.md and TASK.md as context...</span>
              <span className="text-[var(--text-secondary)]">Injecting Helm constraints to {activeIde}...</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Layer ──────────────────────────────────────────────────────── */}
      <ModalLayer
        question={currentQuestion}
        onAnswer={handleAnswerQuestion}
        onClose={() => dequeueModal()}
      />

      {/* ── Migrate Summary Modal ───────────────────────────────────────────── */}
      {migrateSummary && (
        <MigrateSummaryModal
          summary={migrateSummary}
          onClose={() => setMigrateSummary(null)}
        />
      )}

      {/* ── Context Warning Modal ───────────────────────────────────────────── */}
      {contextWarning && (
        <ContextWarningModal
          usage={contextWarning.usage}
          decisions={contextWarning.decisions}
          onSaveADR={async (decisions) => {
            if (!projectRoot) return;
            for (const d of decisions) {
              try {
                const result = await invoke<{ fileName: string }>('write_adr', {
                  projectRoot,
                  title: d,
                  context: 'Extracted from context warning.',
                  decision: d,
                  consequences: 'To be documented.',
                });
                addLog(`DOC: ${result.fileName} saved`);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                addLog(`$> IO.ERROR: ADR write failed — ${msg}`);
              }
            }
            setContextWarning(null);
          }}
          onSkip={() => setContextWarning(null)}
        />
      )}

      {/* ── Execution Progress ────────────────────────────────────────────── */}
      <ExecutionProgress
        sessionId={activeSessionId}
        currentPhase={currentPhase as any}
        activeSkills={activeSkills}
        isExecuting={isExecuting}
        lastUpdate={null}
      />

      {/* ── IDE Selection Wizard ───────────────────────────────────────────── */}
      {wizardOpen && (
        <IdeSelectionWizard
          projectRoot={projectRoot}
          onSelect={handleSelectPlugin}
          onSkip={() => closeWizard()}
        />
      )}

      {/* ── User Error Modal ───────────────────────────────────────────────── */}
      {currentError && (
        <UserErrorModal
          error={currentError}
          onClose={() => setCurrentError(null)}
        />
      )}

      {/* ── Command Palette ──────────────────────────────────────────────────── */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
}
