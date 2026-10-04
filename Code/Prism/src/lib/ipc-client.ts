export async function invoke<T>(command: string, args?: Record<string, any>): Promise<T> {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.invoke) {
    // @ts-ignore
    return window.electronAPI.invoke(command, args);
  }

  // Fallback for debugging in browser without Electron (Slice #0)
  console.warn(`[IPC Mock] invoke called: ${command}`, args);
  if (command === 'read_helm_docs') return [] as unknown as T;
  if (command === 'propose_options') return [] as unknown as T;
  if (command === 'open_in_explorer') return { success: true } as unknown as T;

  throw new Error("Electron IPC API not available");
}

export function onHelmDocChanged(callback: (data: any) => void): () => void {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onHelmDocChanged) {
    // @ts-ignore
    return window.electronAPI.onHelmDocChanged(callback);
  }
  return () => {};
}

export function onShowQuestionModal(callback: (data: any) => void): () => void {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onShowQuestionModal) {
    // @ts-ignore
    return window.electronAPI.onShowQuestionModal(callback);
  }
  return () => {};
}

export function onSessionCreated(callback: (data: { sessionId: string; intentType: string }) => void): () => void {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onSessionCreated) {
    // @ts-ignore
    return window.electronAPI.onSessionCreated(callback);
  }
  return () => {};
}

export function onSessionPhaseChanged(callback: (data: { phase: string }) => void): () => void {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onSessionPhaseChanged) {
    // @ts-ignore
    return window.electronAPI.onSessionPhaseChanged(callback);
  }
  return () => {};
}

export function onHelmViolationDetected(callback: (data: { violations: any[] }) => void): () => void {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onHelmViolationDetected) {
    // @ts-ignore
    return window.electronAPI.onHelmViolationDetected(callback);
  }
  return () => {};
}

export function onContextWarning(callback: (data: { usage: string; decisions: string[] }) => void): () => void {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onContextWarning) {
    // @ts-ignore
    return window.electronAPI.onContextWarning(callback);
  }
  return () => {};
}
