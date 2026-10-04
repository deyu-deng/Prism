import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from './session';

describe('Session Zustand Store', () => {
  beforeEach(() => {
    useSessionStore.setState({ sessions: [], activeSessionId: null });
  });

  it('initializes with empty sessions', () => {
    const state = useSessionStore.getState();
    expect(state.sessions).toEqual([]);
    expect(state.activeSessionId).toBeNull();
  });

  it('createSession adds a new session', () => {
    useSessionStore.getState().createSession({
      id: 'sess-1',
      ideSessionId: 'ide-1',
      workflowPhase: 'explore',
      taskType: 'feature',
      projectRoot: '/mock/proj',
      windowId: 1,
    });
    const state = useSessionStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).toBe('sess-1');
    expect(state.sessions[0].workflowPhase).toBe('explore');
  });

  it('updateSessionPhase patches workflowPhase for a session', () => {
    useSessionStore.getState().createSession({
      id: 'sess-1',
      ideSessionId: 'ide-1',
      workflowPhase: 'explore',
      taskType: 'feature',
      projectRoot: '/mock/proj',
      windowId: 1,
    });
    useSessionStore.getState().updateSessionPhase('sess-1', 'design');
    const sess = useSessionStore.getState().sessions.find(s => s.id === 'sess-1');
    expect(sess?.workflowPhase).toBe('design');
  });

  it('closeSession removes a session by id', () => {
    useSessionStore.getState().createSession({
      id: 'sess-1',
      ideSessionId: 'ide-1',
      workflowPhase: 'explore',
      taskType: 'feature',
      projectRoot: '/mock/proj',
      windowId: 1,
    });
    useSessionStore.getState().closeSession('sess-1');
    expect(useSessionStore.getState().sessions).toHaveLength(0);
  });

  it('setActiveSession sets activeSessionId', () => {
    useSessionStore.getState().setActiveSession('sess-1');
    expect(useSessionStore.getState().activeSessionId).toBe('sess-1');
  });
});
