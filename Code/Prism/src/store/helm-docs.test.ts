import { describe, it, expect, beforeEach } from 'vitest';
import { useHelmDocsStore } from './helm-docs';

describe('HelmDocs Zustand Store', () => {
  beforeEach(() => {
    useHelmDocsStore.setState({ docs: [], selectedDocTitle: null });
  });

  it('initializes with empty docs array', () => {
    const state = useHelmDocsStore.getState();
    expect(state.docs).toEqual([]);
    expect(state.selectedDocTitle).toBeNull();
  });

  it('setDocs replaces the entire docs array', () => {
    const mockDocs = [
      { title: 'TASK.md', status: 'ACTIVE' as const, content: '# Tasks' },
      { title: 'CONTEXT.md', status: 'EMPTY' as const, content: '' },
    ];
    useHelmDocsStore.getState().setDocs(mockDocs);
    expect(useHelmDocsStore.getState().docs).toHaveLength(2);
    expect(useHelmDocsStore.getState().docs[0].title).toBe('TASK.md');
  });

  it('updateDoc patches a single doc by title', () => {
    const mockDocs = [
      { title: 'TASK.md', status: 'EMPTY' as const, content: '' },
      { title: 'CONTEXT.md', status: 'EMPTY' as const, content: '' },
    ];
    useHelmDocsStore.getState().setDocs(mockDocs);
    useHelmDocsStore.getState().updateDoc('TASK.md', { status: 'ACTIVE', content: '# Updated' });

    const taskDoc = useHelmDocsStore.getState().docs.find(d => d.title === 'TASK.md');
    expect(taskDoc?.status).toBe('ACTIVE');
    expect(taskDoc?.content).toBe('# Updated');

    const contextDoc = useHelmDocsStore.getState().docs.find(d => d.title === 'CONTEXT.md');
    expect(contextDoc?.status).toBe('EMPTY');
  });

  it('updateDoc is a no-op if title is not found', () => {
    useHelmDocsStore.getState().setDocs([{ title: 'TASK.md', status: 'EMPTY' as const, content: '' }]);
    useHelmDocsStore.getState().updateDoc('NONEXISTENT.md', { status: 'ACTIVE' });
    expect(useHelmDocsStore.getState().docs).toHaveLength(1);
    expect(useHelmDocsStore.getState().docs[0].status).toBe('EMPTY');
  });

  it('selectDoc sets selectedDocTitle', () => {
    useHelmDocsStore.getState().selectDoc('TASK.md');
    expect(useHelmDocsStore.getState().selectedDocTitle).toBe('TASK.md');
  });

  it('selectDoc with null clears selection', () => {
    useHelmDocsStore.getState().selectDoc('TASK.md');
    useHelmDocsStore.getState().selectDoc(null);
    expect(useHelmDocsStore.getState().selectedDocTitle).toBeNull();
  });
});
