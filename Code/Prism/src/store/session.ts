import { create } from 'zustand';
import type { PrismSession, HelmPhase } from '../types/helm';

interface SessionState {
  sessions: PrismSession[];
  activeSessionId: string | null;
  createSession: (session: Omit<PrismSession, 'createdAt' | 'lastActiveAt'>) => void;
  updateSessionPhase: (sessionId: string, phase: HelmPhase) => void;
  closeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,

  createSession: (session) =>
    set((state) => ({
      sessions: [
        ...state.sessions,
        {
          ...session,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        },
      ],
    })),

  updateSessionPhase: (sessionId, phase) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, workflowPhase: phase, lastActiveAt: new Date() }
          : s
      ),
    })),

  closeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      activeSessionId:
        state.activeSessionId === sessionId
          ? null
          : state.activeSessionId,
    })),

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
}));
