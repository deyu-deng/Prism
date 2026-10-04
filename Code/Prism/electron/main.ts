import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { scanHelmDocs } from './doc-manager/scanner';
import { watchHelmDocs } from './doc-manager/watcher';
import { AdapterManager } from './adapters/AdapterManager';
import {
  loadPersistedState,
  savePersistedState,
  addRecentIntent,
  type PersistedState,
} from '../src/lib/state-persist';
import { PluginRegistry, createPluginRegistry } from './adapters/PluginRegistry';
import { UserErrorHandler, createErrorHandler } from './adapters/user-error-handler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adapterManager = new AdapterManager();
(global as any).prismAdapterManager = adapterManager;
let activeIdeName = 'ClaudeTerminal';

// 插件系统相关变量
let pluginRegistry: PluginRegistry | null = null;
let errorHandler: UserErrorHandler | null = null;

// Persisted state (loaded at startup)
let persistedState: PersistedState | null = null;

// Auto-save interval handle
let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

// Window Manager for multi-window physical isolation
const sessions = new Map<string, BrowserWindow>();

function createSessionWindow(sessionId: string) {
  if (sessions.has(sessionId)) {
    sessions.get(sessionId)?.focus();
    return;
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Check if we are in dev mode (e.g. VITE_DEV_SERVER_URL might be passed, or we just hardcode 1435 for now)
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    win.loadURL('http://127.0.0.1:1435');
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.on('closed', () => {
    sessions.delete(sessionId);
  });

  sessions.set(sessionId, win);
}

// Disable hardware acceleration to fix UI flashing / black screen on Windows
app.disableHardwareAcceleration();

app.on('window-all-closed', () => {
  console.log('[DEBUG-ELECTRON] window-all-closed fired. Quitting app.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('[DEBUG-ELECTRON] before-quit fired.');
});

app.on('will-quit', () => {
  console.log('[DEBUG-ELECTRON] will-quit fired.');
});

app.on('quit', (event, exitCode) => {
  console.log(`[DEBUG-ELECTRON] quit fired. Exit code: ${exitCode}`);
});

app.whenReady().then(async () => {
  console.log('[DEBUG-ELECTRON] app.whenReady() executed!');

  // 初始化插件系统
  console.log('[Prism] Initializing plugin system...');
  const { registry, manager } = createPluginRegistry();
  pluginRegistry = registry;
  errorHandler = createErrorHandler(manager);
  registry.registerAll();
  console.log('[Prism] Plugin system initialized successfully');

  // Trace window creation
  app.on('browser-window-created', (e, window) => {
    console.log('[DEBUG-ELECTRON] browser-window-created!');
    window.on('closed', () => console.log('[DEBUG-ELECTRON] window closed!'));
    window.webContents.on('crashed', () => console.log('[DEBUG-ELECTRON] webContents crashed!'));
    window.on('unresponsive', () => console.log('[DEBUG-ELECTRON] window unresponsive!'));
  });
  // Load persisted state on startup
  persistedState = await loadPersistedState();
  if (persistedState.lastIde) {
    activeIdeName = persistedState.lastIde;
  }
  (global as any).activeIdeName = activeIdeName;

  createSessionWindow('default-session');

  // Auto-save every 30 seconds
  autoSaveInterval = setInterval(async () => {
    if (persistedState) {
      await savePersistedState(persistedState).catch((err) =>
        console.error('Auto-save failed:', err)
      );
    }
  }, 30_000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSessionWindow('default-session');
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Save state before quit
app.on('before-quit', async () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
  if (persistedState) {
    await savePersistedState(persistedState).catch((err) =>
      console.error('Final save on quit failed:', err)
    );
  }
  // Dispose all adapters to close servers and free port bindings
  try {
    adapterManager.getAllAdapters().forEach((adapter) => {
      if (typeof adapter.dispose === 'function') {
        adapter.dispose();
      }
    });
    console.log('Successfully disposed all adapters on quit.');
  } catch (err: any) {
    console.error('Failed to dispose adapters on quit:', err.message);
  }
});

// IPC handlers for Slice #1
ipcMain.handle('select_project_dir', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return null;

  const result = await dialog.showOpenDialog(window, {
    properties: ['openDirectory'],
    title: 'Select Project Directory'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('scan_helm_docs', async (event, payload: { projectRoot: string }) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    watchHelmDocs(payload.projectRoot, window);
  }
  return scanHelmDocs(payload.projectRoot);
});

ipcMain.handle('inject_system_prompt', async (event, payload: {
  projectRoot: string;
  phase: HelmPhase;
  taskType: TaskType;
  contextSummary: string;
  taskSummary: string;
}) => {
  try {
    const prompt = renderSystemPrompt(payload.phase, {
      taskType: payload.taskType,
      currentPhase: payload.phase,
      contextSummary: payload.contextSummary,
      taskSummary: payload.taskSummary,
    });

    const adapter = adapterManager.getAdapter(activeIdeName);
    if (adapter && adapter.injectSystemPrompt) {
      await adapter.injectSystemPrompt(payload.projectRoot, prompt, 'override');
    } else {
      // Fallback: write CLAUDE.md directly
      await fs.writeFile(path.join(payload.projectRoot, 'CLAUDE.md'), prompt, 'utf-8');
    }

    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.webContents.send('helm-doc-changed', {
        title: 'CLAUDE.md',
        status: 'ACTIVE',
        content: prompt,
      });
    }

    return { success: true, phase: payload.phase };
  } catch (err: any) {
    console.error('Failed to inject system prompt:', err);
    throw new Error(err.message || String(err));
  }
});

ipcMain.handle('set_active_ide', async (event, payload: { ideName: string, projectRoot: string }) => {
  console.log(`[Prism] User selected IDE: ${payload.ideName}`);
  activeIdeName = payload.ideName;
  (global as any).activeIdeName = payload.ideName;
  const adapter = adapterManager.getAdapter(activeIdeName);

  if (adapter && adapter.injectRules) {
    await adapter.injectRules(payload.projectRoot).catch((err) => {
      console.error('Failed to inject rules for', activeIdeName, err);
    });
  }

  const window = BrowserWindow.fromWebContents(event.sender);
  if (adapter && adapter.watchOutput && window) {
    adapterManager.getAllAdapters().forEach((a) => {
      if (a.stopWatchOutput) a.stopWatchOutput();
    });
    adapter.watchOutput(payload.projectRoot, (data: any) => {
      if (data && data.__phase) {
        window.webContents.send('session-phase-changed', { phase: data.__phase });
        return;
      }
      if (data && data.__violations) {
        injectCorrection(payload.projectRoot, data.__violations).catch(() => {});
        window.webContents.send('helm-violation-detected', { violations: data.__violations });
        return;
      }
      if (data && data.__contextWarning) {
        window.webContents.send('context-warning', data.__contextWarning);
        return;
      }
      window.webContents.send('show-question-modal', data);
    });
  }
  return { success: true };
});

import { parsePhaseMarkers } from './helm/phase-parser';
import { detectViolations, injectCorrection } from './helm/violation-detector';
import { checkContextWarning } from './helm/context-monitor';
import { writeADR } from './doc-manager/adr-writer';

ipcMain.handle('dispatch_intent', async (event, payload: { intentType: string, text: string, projectRoot: string }) => {
  const adapter = adapterManager.getAdapter(activeIdeName);

  let sessionId: string | null = null;
  if (adapter && adapter.openSession) {
    sessionId = await adapter.openSession(payload.projectRoot, {
      intentType: payload.intentType,
      text: payload.text,
    });

    event.sender.send('session-created', { sessionId, intentType: payload.intentType });
  }

  if (adapter && adapter.sendMessage && sessionId) {
    await adapter.sendMessage(payload.projectRoot, sessionId, payload.text);
  } else {
    await adapter.dispatchIntent(payload.intentType, payload.text, payload.projectRoot);
  }
  return { success: true, sessionId };
});

import * as fs from 'fs/promises';
ipcMain.handle('answer_question', async (event, payload: { questionId: string, answer: any, projectRoot: string }) => {
  try {
    const adapter = adapterManager.getAdapter(activeIdeName);
    if (adapter && adapter.answerPendingQuestion) {
      adapter.answerPendingQuestion(payload.questionId, payload.answer);
      return { success: true };
    }

    const aiDir = path.join(payload.projectRoot, '.ai');
    const intentFile = path.join(aiDir, 'prism-intent.md');
    const timestamp = new Date().toISOString();
    const content = `\n[[PRISM_ANSWER]]\nQUESTION_ID: ${payload.questionId}\nANSWER: ${JSON.stringify(payload.answer)}\nTIMESTAMP: ${timestamp}\n`;
    await fs.appendFile(intentFile, content, 'utf-8');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to answer question:', err);
    throw new Error(err.message || String(err));
  }
});

import { atomicUpdateTask } from './doc-manager/mutator';
import { renderSystemPrompt } from './helm/template-engine';
import { initializeProject, migrateProject } from './doc-manager/index';
import { installGitHooks } from './doc-manager/githooks';
import type { HelmPhase, TaskType } from '../src/types/helm';

ipcMain.handle('update_task_status', async (event, payload: { projectRoot: string, sliceId: string, newStatus: string }) => {
  try {
    return await atomicUpdateTask(payload.projectRoot, payload.sliceId, payload.newStatus);
  } catch (error: any) {
    console.error('Error updating task status:', error);
    throw new Error(error.message || String(error));
  }
});

ipcMain.handle('initialize_project', async (event, payload: { projectRoot: string }) => {
  try {
    const initSummary = await initializeProject(payload.projectRoot);
    await installGitHooks(payload.projectRoot);

    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.webContents.send('helm-doc-changed', {
        title: 'INIT_COMPLETE',
        status: 'ACTIVE',
        content: `Initialized ${initSummary.created.length} Helm documents.`,
      });
    }

    return { success: true, created: initSummary.created };
  } catch (err: any) {
    console.error('Failed to initialize project:', err);
    throw new Error(err.message || String(err));
  }
});

ipcMain.handle('migrate_project', async (event, payload: { projectRoot: string }) => {
  try {
    const summary = await migrateProject(payload.projectRoot);
    return { success: true, ...summary };
  } catch (err: any) {
    console.error('Failed to migrate project:', err);
    throw new Error(err.message || String(err));
  }
});

ipcMain.handle('write_adr', async (event, payload: { projectRoot: string; title: string; context: string; decision: string; consequences: string }) => {
  try {
    const result = await writeADR(payload.projectRoot, {
      title: payload.title,
      context: payload.context,
      decision: payload.decision,
      consequences: payload.consequences,
    });
    return { success: true, fileName: result.fileName, filePath: result.filePath };
  } catch (err: any) {
    console.error('Failed to write ADR:', err);
    throw new Error(err.message || String(err));
  }
});

ipcMain.handle('propose_options', async (event, payload?: { context?: string }) => {
  return [
    { id: 'opt-1', label: 'Use recommended architecture', score: 0.95 },
    { id: 'opt-2', label: 'Run direct implementation', score: 0.8 },
    { id: 'opt-3', label: 'Explore research first', score: 0.7 }
  ];
});

ipcMain.handle('commit_decision', async (event, payload?: { decisionId: string, title?: string }) => {
  return {
    success: true,
    message: `Decision "${payload?.title || payload?.decisionId || 'Untitled'}" committed successfully.`
  };
});

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

ipcMain.handle('open_in_ide', async (event, payload: { ideName: string, fileName: string, taskId: string | null, projectRoot?: string }) => {
  try {
    const { ideName, fileName, projectRoot } = payload;
    if (!projectRoot) return "ERROR: No project root provided";

    // For Helm docs, they are in projectRoot/Helm/docs
    // If fileName is TASK.md or CONTEXT.md, they might be in projectRoot/ or projectRoot/docs/
    let fullPath = path.join(projectRoot, fileName);
    // If the file doesn't exist at root, try docs/
    const fs = require('fs');
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(projectRoot, 'docs', fileName);
    }
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(projectRoot, 'Helm', 'docs', fileName);
    }

    let cmd = '';
    switch (ideName) {
      case 'Cursor': cmd = `cursor "${fullPath}"`; break;
      case 'VSCode': cmd = `code "${fullPath}"`; break;
      case 'Windsurf': cmd = `windsurf "${fullPath}"`; break;
      case 'Idea': cmd = `idea "${fullPath}"`; break;
      case 'WebStorm': cmd = `webstorm "${fullPath}"`; break;
      case 'ClaudeCode': cmd = `claude "${fullPath}"`; break;
      case 'Antigravity': cmd = `echo "Antigravity selected, file path: ${fullPath}"`; break; // Antigravity doesn't have a CLI launcher standard
      default: cmd = `code "${fullPath}"`;
    }

    if (ideName !== 'Antigravity') {
      await execAsync(cmd);
    }
    return `SUCCESS: Opened ${fileName} in ${ideName}`;
  } catch (err: any) {
    console.error('Failed to open in IDE:', err);
    return `ERROR: ${err.message}`;
  }
});

ipcMain.handle('delegate_intent_to_gui', async (event, payload?: { intentText: string }) => {
  return {
    success: true,
    message: `Intent "${payload?.intentText || 'Default'}" successfully delegated to GUI.`
  };
});

// ---------------------------------------------------------------------------
// Shell actions IPC handlers (Slice #17)
// ---------------------------------------------------------------------------

ipcMain.handle('open_in_explorer', async (_event, payload: { filePath: string }) => {
  try {
    const { shell } = require('electron');
    shell.showItemInFolder(payload.filePath);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to open in explorer:', err);
    return { success: false, error: err.message };
  }
});

// ---------------------------------------------------------------------------
// Persistence IPC handlers (Slice #16)
// ---------------------------------------------------------------------------

ipcMain.handle('get_persisted_state', async () => {
  if (!persistedState) {
    persistedState = await loadPersistedState();
  }
  return persistedState;
});

ipcMain.handle('save_persisted_state', async (_event, partial: Partial<PersistedState>) => {
  if (!persistedState) {
    persistedState = await loadPersistedState();
  }
  persistedState = { ...persistedState, ...partial };
  await savePersistedState(persistedState);
  return { success: true };
});

// ---------------------------------------------------------------------------
// 插件系统 IPC 处理器
// ---------------------------------------------------------------------------

// 获取插件摘要信息
ipcMain.handle('get_plugin_summary', async (_event, { projectRoot }: { projectRoot?: string }) => {
  if (!pluginRegistry) {
    return { success: false, error: 'Plugin system not initialized' };
  }
  try {
    const data = await pluginRegistry.getPluginSummary(projectRoot);
    return { success: true, data };
  } catch (error: any) {
    console.error('[Prism] Failed to get plugin summary:', error);
    return { success: false, error: error.message };
  }
});

// 运行诊断
ipcMain.handle('run_diagnostics', async (_event, { projectRoot }: { projectRoot?: string }) => {
  if (!pluginRegistry || !errorHandler) {
    return { success: false, error: 'Plugin system not initialized' };
  }
  try {
    const result = await errorHandler.generateDiagnosticSummary(projectRoot);
    return {
      success: true,
      report: JSON.stringify(result.report, null, 2),
      userSummary: result.error.message
    };
  } catch (error: any) {
    console.error('[Prism] Failed to run diagnostics:', error);
    return { success: false, error: error.message };
  }
});

// 设置活动插件
ipcMain.handle('set_active_plugin', async (event, { pluginId, projectRoot }: { pluginId: string; projectRoot?: string }) => {
  if (!pluginRegistry) {
    return { success: false, error: 'Plugin system not initialized' };
  }
  try {
    const manager = pluginRegistry.getManager();
    const success = await manager.setActivePlugin(pluginId, projectRoot);
    if (success) {
      activeIdeName = pluginId;
      (global as any).activeIdeName = activeIdeName;
      // 保存到持久化状态
      if (persistedState) {
        persistedState.lastIde = pluginId;
        await savePersistedState(persistedState);
      }
      console.log(`[Prism] Set active plugin to ${pluginId}`);
      return { success: true };
    }
    return { success: false, error: 'Failed to activate plugin' };
  } catch (error: any) {
    console.error('[Prism] Failed to set active plugin:', error);
    return { success: false, error: error.message };
  }
});
