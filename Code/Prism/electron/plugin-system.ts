/**
 * Plugin System Integration for Electron Main Process
 * 
 * 这个文件提供了将新插件化架构集成到现有 main.ts 的方法
 * 可以逐步迁移，不需要一次性重写整个 main.ts
 */

import { createPluginRegistry, getGlobalPluginManager, PluginRegistry } from './adapters/PluginRegistry';
import { PluginManager } from './adapters/PluginManager';
import { IDEHealthCheck, ideHealthCheck } from './adapters/ide-health-check';
import { UserFacingError, createErrorHandler } from './adapters/user-error-handler';
import type { PrismPlugin } from './adapters/plugin-types';

// ---------------------------------------------------------------------------
// 全局单例（延迟初始化）
// ---------------------------------------------------------------------------

let _pluginManager: PluginManager | null = null;
let _pluginRegistry: PluginRegistry | null = null;
let _errorHandler: ReturnType<typeof createErrorHandler> | null = null;

/**
 * 初始化插件系统（在 app.whenReady() 中调用）
 */
export function initializePluginSystem(config?: {
  autoDetect?: boolean;
  enableHealthCheck?: boolean;
}): {
  pluginManager: PluginManager;
  pluginRegistry: PluginRegistry;
} {
  console.log('[Prism] Initializing plugin system...');

  // 创建 PluginManager 和 PluginRegistry
  const { manager, registry } = createPluginRegistry({
    autoDetect: config?.autoDetect ?? true,
    healthCheckInterval: config?.enableHealthCheck ? 60_000 : 0,
  });

  _pluginManager = manager;
  _pluginRegistry = registry;

  // 创建错误处理器
  _errorHandler = createErrorHandler(manager, ideHealthCheck);

  // 监听插件事件（用于日志和调试）
  manager.on((event) => {
    switch (event.type) {
      case 'registered':
        console.log(`[Prism] Plugin registered: ${event.pluginId}`);
        break;
      case 'activated':
        console.log(`[Prism] Plugin activated: ${event.pluginId}`);
        // 通知渲染进程
        notifyAllWindows('plugin-activated', { pluginId: event.pluginId });
        break;
      case 'error':
        console.error(`[Prism] Plugin error: ${event.pluginId}`, event.error);
        notifyAllWindows('plugin-error', { 
          pluginId: event.pluginId, 
          error: event.error.message 
        });
        break;
      case 'health-changed':
        if (event.health.status === 'unhealthy') {
          console.warn(`[Prism] Plugin unhealthy: ${event.pluginId}`, event.health.error);
        }
        break;
    }
  });

  console.log('[Prism] Plugin system initialized successfully');
  
  return { pluginManager: manager, pluginRegistry: registry };
}

/**
 * 获取全局 PluginManager 实例
 */
export function getPluginManager(): PluginManager {
  if (!_pluginManager) {
    throw new Error('[Prism] Plugin system not initialized. Call initializePluginSystem() first.');
  }
  return _pluginManager;
}

/**
 * 获取全局错误处理器
 */
export function getErrorHandler() {
  if (!_errorHandler) {
    throw new Error('[Prism] Error handler not initialized.');
  }
  return _errorHandler;
}

// ---------------------------------------------------------------------------
// IDE 检测和激活辅助函数
// ---------------------------------------------------------------------------

/**
 * 自动检测并激活最佳可用IDE
 * 在项目加载时调用
 */
export async function autoSelectBestIDE(projectRoot?: string): Promise<{
  success: boolean;
  activePluginId: string | null;
  availablePlugins: string[];
  userMessage?: UserFacingError;
}> {
  const manager = getPluginManager();
  
  try {
    // 执行自动检测
    const activeId = await manager.autoDetectAndActivate(projectRoot);
    
    // 获取所有可用插件
    const availablePlugins = await ideHealthCheck.getAvailableIDEs(projectRoot);

    if (activeId) {
      console.log(`[Prism] Auto-selected IDE: ${activeId}`);
      return {
        success: true,
        activePluginId: activeId,
        availablePlugins,
      };
    }

    // 没有检测到任何IDE
    console.warn('[Prism] No IDE detected during auto-selection');
    const errorHandler = getErrorHandler();
    const userMessage = errorHandler.generateNoIDEPrompt(projectRoot);

    return {
      success: false,
      activePluginId: null,
      availablePlugins,
      userMessage,
    };
  } catch (error: any) {
    console.error('[Prism] Auto-detection failed:', error);
    const errorHandler = getErrorHandler();
    const userMessage = await errorHandler.classifyError(error, {
      operation: 'auto-detect-ide',
    });

    return {
      success: false,
      activePluginId: null,
      availablePlugins: [],
      userMessage,
    };
  }
}

/**
 * 手动设置活动IDE（带完整验证）
 */
export async function setActiveIDE(
  pluginId: string,
  projectRoot?: string
): Promise<{
  success: boolean;
  error?: UserFacingError;
}> {
  const manager = getPluginManager();

  try {
    // 验证插件是否存在
    const plugin = await manager.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    // 尝试激活
    const activated = await manager.setActivePlugin(pluginId, projectRoot);

    if (activated) {
      console.log(`[Prism] Successfully activated IDE: ${pluginId}`);
      
      // 更新全局状态
      (global as any).activeIdeName = pluginId;

      return { success: true };
    } else {
      // 激活失败（可能IDE未安装）
      const errorHandler = getErrorHandler();
      const error = await errorHandler.classifyError(
        new Error(`Failed to activate ${pluginId}. IDE may not be installed or configured.`),
        { pluginId, ideName: plugin.name, operation: 'activate-plugin' }
      );

      return { success: false, error };
    }
  } catch (err: any) {
    const errorHandler = getErrorHandler();
    const error = await errorHandler.classifyError(err, {
      pluginId,
      operation: 'set-active-ide',
    });

    return { success: false, error };
  }
}

// ---------------------------------------------------------------------------
// 改进的 IPC Handler 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建安全的 dispatchIntent IPC handler
 * 包含完整的错误处理、fallback机制和用户反馈
 */
export async function safeDispatchIntent(
  intentType: string,
  text: string,
  projectRoot: string,
  sendToRenderer: (channel: string, data: any) => void
): Promise<{
  success: boolean;
  sessionId?: string;
  error?: UserFacingError;
}> {
  const manager = getPluginManager();

  try {
    // 获取当前活动插件
    let plugin = manager.getActivePlugin();
    
    // 如果没有活动插件，尝试使用 generic-file fallback
    if (!plugin) {
      console.warn('[Prism] No active plugin, attempting to use generic-file fallback');
      plugin = await manager.getPlugin('generic-file');
    }

    if (!plugin) {
      throw new Error('No adapter available. Please install or select an IDE.');
    }

    // 打开会话（如果支持）
    let sessionId: string | null = null;
    if (plugin.openSession) {
      sessionId = await plugin.openSession(projectRoot, {
        intentType,
        text,
      });

      sendToRenderer('session-created', { 
        sessionId, 
        intentType,
        pluginId: plugin.id,
      });
    }

    // 发送消息或分发意图
    if (plugin.sendMessage && sessionId) {
      await plugin.sendMessage(projectRoot, sessionId, text);
    } else {
      await plugin.dispatchIntent(intentType, text, projectRoot);
    }

    return { success: true, sessionId: sessionId || undefined };

  } catch (error: any) {
    console.error('[Prism] Failed to dispatch intent:', error);
    
    const errorHandler = getErrorHandler();
    const userError = await errorHandler.classifyError(error, {
      operation: 'dispatch-intent',
      pluginId: manager.getActivePluginId() || undefined,
    });

    sendToRenderer('intent-error', userError);

    return { success: false, error: userError };
  }
}

/**
 * 创建安全的 answerQuestion IPC handler
 */
export async function safeAnswerQuestion(
  questionId: string,
  answer: any,
  projectRoot: string
): Promise<{
  success: boolean;
  error?: UserFacingError;
}> {
  const manager = getPluginManager();

  try {
    const plugin = manager.getActivePlugin();
    
    if (plugin?.answerPendingQuestion) {
      plugin.answerPendingQuestion(questionId, answer);
      return { success: true };
    }

    // Fallback：写入文件
    const fs = await import('fs/promises');
    const path = await import('path');
    const aiDir = path.join(projectRoot, '.ai');
    const intentFile = path.join(aiDir, 'prism-intent.md');
    const timestamp = new Date().toISOString();
    const content = `\n[[PRISM_ANSWER]]\nQUESTION_ID: ${questionId}\nANSWER: ${JSON.stringify(answer)}\nTIMESTAMP: ${timestamp}\n`;
    await fs.appendFile(intentFile, content, 'utf-8');

    return { success: true };
  } catch (error: any) {
    const errorHandler = getErrorHandler();
    const userError = await errorHandler.classifyError(error, {
      operation: 'answer-question',
    });

    return { success: false, error: userError };
  }
}

// ---------------------------------------------------------------------------
// 诊断工具
// ---------------------------------------------------------------------------

/**
 * 运行完整的系统诊断
 */
export async function runDiagnostics(projectRoot?: string): Promise<{
  report: Awaited<ReturnType<PluginManager['generateDiagnosticReport']>>;
  userSummary: UserFacingError;
}> {
  const manager = getPluginManager();
  const errorHandler = getErrorHandler();

  const { error: userSummary, report } = await errorHandler.generateDiagnosticSummary(projectRoot);

  return { report, userSummary };
}

/**
 * 获取所有插件的摘要信息（用于UI展示）
 */
export async function getPluginSummaryForUI(projectRoot?: string): Promise<Array<{
  id: string;
  name: string;
  description: string;
  status: import('./adapters/plugin-types').PluginStatus;
  available: boolean;
  experimental: boolean;
}>> {
  const registry = _pluginRegistry;
  if (!registry) {
    throw new Error('Plugin registry not initialized');
  }

  return await registry.getPluginSummary(projectRoot);
}

// ---------------------------------------------------------------------------
// 内部工具函数
// ---------------------------------------------------------------------------

function notifyAllWindows(channel: string, data: any): void {
  const { BrowserWindow } = require('electron');
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send(channel, data);
  });
}

// ---------------------------------------------------------------------------
// 清理函数（在 app.on('before-quit') 中调用）
// ---------------------------------------------------------------------------

export async function cleanupPluginSystem(): Promise<void> {
  console.log('[Prism] Cleaning up plugin system...');

  if (_pluginManager) {
    await _pluginManager.dispose();
    _pluginManager = null;
  }

  _pluginRegistry = null;
  _errorHandler = null;

  console.log('[Prism] Plugin system cleaned up');
}
