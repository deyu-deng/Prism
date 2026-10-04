import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './ui';

describe('UI Zustand Store', () => {
  beforeEach(() => {
    useUIStore.setState({
      inspectorOpen: false,
      consoleExpanded: false,
      modalQueue: [],
      intentInput: '',
      isDeducing: false,
    });
  });

  it('initializes with default UI state', () => {
    const state = useUIStore.getState();
    expect(state.inspectorOpen).toBe(false);
    expect(state.consoleExpanded).toBe(false);
    expect(state.modalQueue).toEqual([]);
    expect(state.intentInput).toBe('');
    expect(state.isDeducing).toBe(false);
  });

  it('setInspectorOpen toggles inspector visibility', () => {
    useUIStore.getState().setInspectorOpen(true);
    expect(useUIStore.getState().inspectorOpen).toBe(true);
    useUIStore.getState().setInspectorOpen(false);
    expect(useUIStore.getState().inspectorOpen).toBe(false);
  });

  it('setConsoleExpanded toggles console tray height', () => {
    useUIStore.getState().setConsoleExpanded(true);
    expect(useUIStore.getState().consoleExpanded).toBe(true);
  });

  it('enqueueModal adds question to queue', () => {
    const q = { id: 'q1', type: 'choice' as const, title: 'Choose' };
    useUIStore.getState().enqueueModal(q);
    expect(useUIStore.getState().modalQueue).toHaveLength(1);
    expect(useUIStore.getState().modalQueue[0].id).toBe('q1');
  });

  it('dequeueModal removes first item from queue', () => {
    const q1 = { id: 'q1', type: 'choice' as const, title: 'A' };
    const q2 = { id: 'q2', type: 'confirm' as const, title: 'B' };
    useUIStore.getState().enqueueModal(q1);
    useUIStore.getState().enqueueModal(q2);
    useUIStore.getState().dequeueModal();
    expect(useUIStore.getState().modalQueue).toHaveLength(1);
    expect(useUIStore.getState().modalQueue[0].id).toBe('q2');
  });

  it('clearModalQueue empties the queue', () => {
    useUIStore.getState().enqueueModal({ id: 'q1', type: 'choice' as const, title: 'A' });
    useUIStore.getState().clearModalQueue();
    expect(useUIStore.getState().modalQueue).toEqual([]);
  });

  it('setIntentInput updates the input text', () => {
    useUIStore.getState().setIntentInput('Add a button');
    expect(useUIStore.getState().intentInput).toBe('Add a button');
  });

  it('setIsDeducing tracks the deduction overlay', () => {
    useUIStore.getState().setIsDeducing(true);
    expect(useUIStore.getState().isDeducing).toBe(true);
    useUIStore.getState().setIsDeducing(false);
    expect(useUIStore.getState().isDeducing).toBe(false);
  });
});
