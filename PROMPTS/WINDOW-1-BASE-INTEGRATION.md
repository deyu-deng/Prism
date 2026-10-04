# AI Programmer #1 提示词：基础设施集成

## 你的角色
你是 Prism 项目的 **基础设施集成工程师**，负责将新开发的插件化架构集成到现有的 Electron 主进程 (`main.ts`) 中。

## 核心任务
**将7个新模块（PluginManager、PluginRegistry等）集成到 main.ts，使应用能够正常启动并使用新的插件系统。**

## 必读文档（先读完再动手）
1. **`DEVELOPMENT.md`** - 项目协作文档（MASTER DOCUMENT）
2. **`electron/plugin-system.ts`** - 集成层代码（已写好）
3. **`electron/adapters/PluginManager.ts`** - 新的插件管理器
4. **`electron/adapters/AdapterManager.ts`** - 旧的管理器（需兼容）
5. **`electron/main.ts`** - 需要修改的主文件

## 具体工作清单

### Step 1: 理解现有代码 (30分钟)
- [ ] 阅读 `main.ts` 全文，理解当前的初始化流程
- [ ] 阅读 `plugin-system.ts`，理解提供的集成函数
- [ ] 标记出所有引用 `adapterManager` 或 `activeIdeName` 的位置

### Step 2: 修改 main.ts 的导入和初始化 (1小时)

**位置**: 文件顶部（第1-20行附近）

```diff
+ // 新增导入
+ import { 
+   initializePluginSystem, 
+   getPluginManager,
+   autoSelectBestIDE,
+   safeDispatchIntent,
+   cleanupPluginSystem,
+   getPluginSummaryForUI,
+   runDiagnostics,
+ } from './plugin-system';
  
- import { AdapterManager } from './adapters/AdapterManager';
```

**位置**: 全局变量声明（第17-19行）

```diff
- const adapterManager = new AdapterManager();
- (global as any).prismAdapterManager = adapterManager;
- let activeIdeName = 'ClaudeTerminal';
+ let pluginManager: any = null;
+ let activeIdeName: string | null = null;
```

### Step 3: 修改 app.whenReady() 初始化逻辑 (1小时)

**位置**: 第85行附近的 `app.whenReady().then(async () => {`

在现有代码块内、`persistedState = await loadPersistedState()` 之后添加：

```typescript
// === NEW: Initialize Plugin System ===
console.log('[Prism] Initializing plugin system...');
const { pluginManager: pm } = initializePluginSystem({
  autoDetect: true,
  enableHealthCheck: true,
});
pluginManager = pm;

// Auto-detect available IDEs
const detection = await autoSelectBestIDE();
if (detection.success && detection.activePluginId) {
  activeIdeName = detection.activePluginId;
  (global as any).activeIdeName = activeIdeName;
  console.log(`[Prism] Auto-selected IDE: ${activeIdeName}`);
} else {
  console.warn('[Prism] No IDE detected. User will need to select manually.');
  if (detection.userMessage) {
    console.log('[Prism] Installation guide available:', detection.userMessage.title);
  }
}

// Restore persisted IDE preference (if no auto-detection)
if (!activeIdeName && persistedState?.lastIde) {
  try {
    const { setActiveIDE } = await import('./plugin-system');
    const result = await setActiveIDE(persistedState.lastIde);
    if (result.success) {
      activeIdeName = persistedState.lastIde;
      (global as any).activeIdeName = activeIdeName;
    }
  } catch (err) {
    console.error('[Prism] Failed to restore saved IDE preference:', err);
  }
}
// === END Plugin System Initialization ===
```

同时注释掉或删除原来的：
```diff
- // Restore last active IDE if available
- if (persistedState.lastIde) {
-   activeIdeName = persistedState.lastIde;
- }
- (global as any).activeIdeName = activeIdeName;
```

### Step 4: 修改 set_active_ide IPC handler (1小时)

**位置**: 第215行 `ipcMain.handle('set_active_ide', ...)`

完整替换为：

```typescript
ipcMain.handle('set_active_ide', async (event, payload: { ideName: string, projectRoot: string }) => {
  console.log(`[Prism] User selected IDE: ${payload.ideName}`);
  
  try {
    // 使用新的安全激活方法
    const { setActiveIDE } = await import('./plugin-system');
    const result = await setActiveIDE(payload.ideName, payload.projectRoot);
    
    if (!result.success && result.error) {
      // 发送错误信息到渲染进程
      event.sender.send('ide-selection-error', {
        title: result.error.title,
        message: result.error.message,
        severity: result.error.severity,
        suggestions: result.error.suggestions,
      });
      
      return { success: false, error: result.error.message };
    }
    
    // 更新全局状态
    activeIdeName = payload.ideName;
    (global as any).activeIdeName = payload.ideName;

    // 启动输出监控（从原有逻辑迁移）
    const manager = getPluginManager();
    const plugin = manager.getActivePlugin();
    const window = BrowserWindow.fromWebContents(event.sender);

    if (plugin?.watchOutput && window) {
      // 先停止其他插件的监控
      manager.getAllPlugins().forEach(p => {
        if (p.stopWatchOutput && p.id !== payload.ideName) {
          p.stopWatchOutput();
        }
      });

      // 启动当前插件的监控
      plugin.watchOutput(payload.projectRoot, (data: any) => {
        if (!data) return;
        
        if (data.__phase) {
          window.webContents.send('session-phase-changed', { phase: data.__phase });
          return;
        }
        if (data.__violations) {
          injectCorrection(payload.projectRoot, data.__violations).catch(() => {});
          window.webContents.send('helm-violation-detected', { violations: data.__violations });
          return;
        }
        if (data.__contextWarning) {
          window.webContents.send('context-warning', data.__contextWarning);
          return;
        }
        window.webContents.send('show-question-modal', data);
      });
    }

    // 通知前端插件已激活
    if (window) {
      window.webContents.send('plugin-activated', { 
        pluginId: payload.ideName,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
    
  } catch (error: any) {
    console.error('[Prism] Error in set_active_ide:', error);
    
    // Fallback to old behavior for safety
    activeIdeName = payload.ideName;
    (global as any).activeIdeName = payload.ideName;
    
    return { success: true, warning: 'Used fallback mode' };
  }
});
```

### Step 5: 修改 dispatch_intent IPC handler (45分钟)

**位置**: 第258行 `ipcMain.handle('dispatch_intent', ...)`

替换核心逻辑为：

```typescript
ipcMain.handle('dispatch_intent', async (event, payload: { intentType: string, text: string, projectRoot: string }) => {
  console.log(`[Prism] Dispatching intent: ${payload.intentType}`);
  
  try {
    const sendToRenderer = (channel: string, data: any) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) window.webContents.send(channel, data);
    };
    
    // 使用新的安全分发方法
    const { safeDispatchIntent } = await import('./plugin-system');
    const result = await safeDispatchIntent(
      payload.intentType,
      payload.text,
      payload.projectRoot,
      sendToRenderer
    );

    return result;
    
  } catch (error: any) {
    console.error('[Prism] Failed to dispatch intent:', error);
    
    // Fallback: 尝试旧的 adapterManager 方式
    try {
      const { AdapterManager } = await import('./adapters/AdapterManager');
      const fallbackManager = new AdapterManager(); // 临时实例
      const adapter = fallbackManager.getAdapter(activeIdeName || 'generic-file') 
                     || fallbackManager.getAdapter('generic-file');
      
      if (!adapter) throw new Error("No adapter available");
      
      let sessionId: string | null = null;
      if (adapter.openSession) {
        sessionId = await adapter.openSession(payload.projectRoot, {
          intentType: payload.intentType,
          text: payload.text,
        });
        
        event.sender.send('session-created', { 
          sessionId, 
          intentType: payload.intentType 
        });
      }

      if (adapter.sendMessage && sessionId) {
        await adapter.sendMessage(payload.projectRoot, sessionId, payload.text);
      } else {
        await adapter.dispatchIntent(payload.intentType, payload.text, payload.projectRoot);
      }

      return { success: true, sessionId, warning: 'Used fallback adapter' };
      
    } catch (fallbackError: any) {
      console.error('[Prism] Fallback also failed:', fallbackError);
      throw new Error(fallbackError.message || 'Dispatch intent failed');
    }
  }
});
```

### Step 6: 添加新的诊断 IPC handlers (30分钟)

在 main.ts 文件末尾（最后一个 `ipcMain.handle` 之后）添加：

```typescript
// ===========================================================================
// Plugin System Diagnostics (NEW - Phase 1)
// ===========================================================================

ipcMain.handle('get_plugin_summary', async (_event, projectRoot?: string) => {
  try {
    const { getPluginSummaryForUI } = await import('./plugin-system');
    const summary = await getPluginSummaryForUI(projectRoot);
    return { success: true, data: summary, timestamp: new Date().toISOString() };
  } catch (error: any) {
    console.error('[Prism] Failed to get plugin summary:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run_diagnostics', async (_event, projectRoot?: string) => {
  try {
    const { runDiagnostics } = await import('./plugin-system');
    const { report, userSummary } = await runDiagnostics(projectRoot);
    return { 
      success: true, 
      report,
      userSummary,
      generatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[Prism] Diagnostics failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get_installation_guide', async (_event, pluginId: string) => {
  try {
    const { getPluginManager } = await import('./plugin-system');
    const manager = getPluginManager();
    const guide = manager.getInstallationGuide(pluginId);
    return { success: true, guide };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auto_detect_ides', async (_event, projectRoot?: string) => {
  try {
    const { autoSelectBestIDE } = await import('./plugin-system');
    const result = await autoSelectBestIDE(projectRoot);
    return { 
      success: true,
      ...result,
      checkedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
```

### Step 7: 更新清理逻辑 (15分钟)

**位置**: 第129行 `app.on('before-quit', ...)`

```diff
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
    
-   // Dispose all adapters to close servers and free port bindings
-   try {
-     adapterManager.getAllAdapters().forEach((adapter) => {
-       if (typeof adapter.dispose === 'function') {
-         adapter.dispose();
-       }
-     });
-     console.log('Successfully disposed all adapters on quit.');
-   } catch (err: any) {
-     console.error('Failed to dispose adapters on quit:', err.message);
-   }
+   
+   // NEW: Use plugin system cleanup
+   try {
+     await cleanupPluginSystem();
+     console.log('[Prism] Plugin system disposed successfully.');
+   } catch (err: any) {
+     console.error('[Prism] Error during plugin system cleanup:', err.message);
+   }
  });
```

## 测试验证清单

完成上述修改后，必须执行以下测试：

### 编译测试
```bash
cd d:\Cloud\Projects\01-Prism\Code\Prism
npx tsc --noEmit   # 检查类型错误
```

### 单元测试
```bash
npm test -- tests/integration/plugin-system.spec.ts
npm test -- electron/adapters/adapter.test.ts
```

### 手动启动测试
```bash
npm run dev
```
然后在控制台观察：
- ✅ 应该看到 `[Prism] Initializing plugin system...`
- ✅ 应该看到 `[Prism] Plugin system initialized successfully`
- ✅ 应该看到 IDE检测结果（或"No IDE detected"警告）
- ✅ 应用窗口正常打开
- ✅ 不应该有端口冲突错误

### 功能测试（在DevTools Console中执行）
```javascript
# 测试获取插件摘要
await window.electron.ipcRenderer.invoke('get_plugin_summary', 'd:\\Cloud\\Projects\\01-Prism')

# 测试运行诊断
await window.electron.ipcRenderer.invoke('run_diagnostics', 'd:\\Cloud\\Projects\\01-Prism')
```

## 交付物

### 必须提交的内容
1. **修改后的 `main.ts`** - 完整文件（不要用diff，直接给完整版）
2. **测试报告** - 包括：
   - 编译是否通过
   - 测试是否通过
   - 手动测试结果截图（文字描述）
   - 遇到的问题和解决方案
3. **更新 DEVELOPMENT.md** - 在"进度追踪"部分标记 Window 1 完成

### 可选但推荐
4. **回滚方案** - 如果出问题如何快速恢复到改动前
5. **性能对比** - 启动时间、内存占用的前后对比

## 常见问题预判

### Q1: 如果 plugin-system.ts 导入报错？
A: 检查路径是否正确。`./plugin-system` 相对于 `electron/main.ts`。如果报模块找不到，可能需要检查 tsconfig.json 的路径映射。

### Q2: 如果应用启动后白屏？
A: 很可能是某个导入导致了异常。在 `initializePluginSystem()` 调用处加 try-catch，打印详细错误。

### Q3: 如果旧的适配器功能失效？
A: 我在 dispatch_intent 中加入了 fallback 逻辑。如果新系统失败会自动降级到旧方式。检查控制台是否有 "Used fallback adapter" 警告。

## 完成信号
当你看到以下输出时，任务完成：
```
✅ TypeScript编译无错误
✅ 所有测试通过
✅ 应用可正常启动
✅ 控制台显示插件系统已初始化
✅ IPC handlers 可调用
```

**现在开始工作吧！每完成一个Step就在对应项打勾。**
