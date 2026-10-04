import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (command: string, args: any) => ipcRenderer.invoke(command, args),
  onHelmDocChanged: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('helm-doc-changed', handler);
    return () => ipcRenderer.removeListener('helm-doc-changed', handler);
  },
  onShowQuestionModal: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('show-question-modal', handler);
    return () => ipcRenderer.removeListener('show-question-modal', handler);
  },
  onSessionCreated: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('session-created', handler);
    return () => ipcRenderer.removeListener('session-created', handler);
  },
  onSessionPhaseChanged: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('session-phase-changed', handler);
    return () => ipcRenderer.removeListener('session-phase-changed', handler);
  },
  onHelmViolationDetected: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('helm-violation-detected', handler);
    return () => ipcRenderer.removeListener('helm-violation-detected', handler);
  },
  onContextWarning: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('context-warning', handler);
    return () => ipcRenderer.removeListener('context-warning', handler);
  },
});
