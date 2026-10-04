import { create } from 'zustand';
import type { PrismQuestion } from '../types/helm';

// ---------------------------------------------------------------------------
// Plugin types (shared with IdeSelectionWizard) - kept for type compatibility
// with the new plugin system components that are not yet wired into App.
// These can be safely ignored by the original UI flow.
// ---------------------------------------------------------------------------

export interface PluginSummary {
  id: string;
  name: string;
  description: string;
  status: 'registered' | 'loaded' | 'active' | 'error' | 'disabled';
  available: boolean;
  experimental: boolean;
  installationGuide?: {
    title: string;
    steps: Array<{
      title: string;
      description: string;
      command?: string;
    }>;
  };
}

export interface DiagnosticResult {
  success: boolean;
  report: string;
  userSummary: string;
}

export interface TaskItem {
  id: string;
  title: string;
  status: 'done' | 'running' | 'pending' | 'blocked';
}

interface UIState {
  // Original state (used by App.tsx)
  inspectorOpen: boolean;
  consoleExpanded: boolean;
  modalQueue: PrismQuestion[];
  intentInput: string;
  isDeducing: boolean;

  // New plugin-system state (used by IdeSelectionWizard/ExecutionProgress/UserErrorModal)
  wizardOpen: boolean;
  plugins: PluginSummary[];
  pluginsLoading: boolean;
  selectedPluginId: string | null;
  expandedGuideId: string | null;
  diagnosticResult: DiagnosticResult | null;
  diagnosticLoading: boolean;

  // Execution Progress state
  isExecuting: boolean;
  currentPhase: string | null;
  activeSkills: string[];
  tasks: TaskItem[];

  // Error modal state
  currentError: {
    title: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestions: Array<{
      text: string;
      action?: {
        type: 'install' | 'configure' | 'retry' | 'open-url' | 'copy-command';
        payload?: string;
        label: string;
      };
    }>;
    technicalDetails?: string;
    documentationUrl?: string;
  } | null;

  // Original actions
  setInspectorOpen: (open: boolean) => void;
  setConsoleExpanded: (expanded: boolean) => void;
  enqueueModal: (question: PrismQuestion) => void;
  dequeueModal: () => void;
  clearModalQueue: () => void;
  setIntentInput: (text: string) => void;
  setIsDeducing: (deducing: boolean) => void;

  // New plugin-system actions (kept as no-ops or simple setters so that
  // the new components can be type-checked without affecting existing flow)
  openWizard: () => void;
  closeWizard: () => void;
  setPlugins: (plugins: PluginSummary[]) => void;
  setPluginsLoading: (loading: boolean) => void;
  selectPlugin: (id: string | null) => void;
  toggleGuide: (id: string | null) => void;
  setDiagnosticResult: (result: DiagnosticResult | null) => void;
  setDiagnosticLoading: (loading: boolean) => void;

  setIsExecuting: (executing: boolean) => void;
  setCurrentPhase: (phase: string | null) => void;
  setActiveSkills: (skills: string[]) => void;
  setTasks: (tasks: TaskItem[]) => void;
  updateTaskStatus: (taskId: string, status: TaskItem['status']) => void;

  setCurrentError: (error: UIState['currentError']) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Original initial state
  inspectorOpen: false,
  consoleExpanded: false,
  modalQueue: [],
  intentInput: '',
  isDeducing: false,

  // New plugin-system initial state
  wizardOpen: false,
  plugins: [],
  pluginsLoading: false,
  selectedPluginId: null,
  expandedGuideId: null,
  diagnosticResult: null,
  diagnosticLoading: false,

  isExecuting: false,
  currentPhase: null,
  activeSkills: [],
  tasks: [],

  currentError: null,

  // Original actions
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setConsoleExpanded: (expanded) => set({ consoleExpanded: expanded }),

  enqueueModal: (question) =>
    set((state) => ({
      modalQueue: [...state.modalQueue, question],
    })),

  dequeueModal: () =>
    set((state) => ({
      modalQueue: state.modalQueue.slice(1),
    })),

  clearModalQueue: () => set({ modalQueue: [] }),
  setIntentInput: (text) => set({ intentInput: text }),
  setIsDeducing: (deducing) => set({ isDeducing: deducing }),

  // New plugin-system actions
  openWizard: () => set({ wizardOpen: true }),
  closeWizard: () => set({ wizardOpen: false }),
  setPlugins: (plugins) => set({ plugins }),
  setPluginsLoading: (loading) => set({ pluginsLoading: loading }),
  selectPlugin: (id) => set({ selectedPluginId: id }),
  toggleGuide: (id) =>
    set((state) => ({
      expandedGuideId: state.expandedGuideId === id ? null : id,
    })),
  setDiagnosticResult: (result) => set({ diagnosticResult: result }),
  setDiagnosticLoading: (loading) => set({ diagnosticLoading: loading }),

  setIsExecuting: (executing) => set({ isExecuting: executing }),
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
  setActiveSkills: (skills) => set({ activeSkills: skills }),
  setTasks: (tasks) => set({ tasks }),
  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    })),

  setCurrentError: (error) => set({ currentError: error }),
}));
