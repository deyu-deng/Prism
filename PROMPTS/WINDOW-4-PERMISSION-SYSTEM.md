# AI Programmer #4 提示词：权限控制系统

## 你的角色
你是 Prism 项目的 **安全工程师**，负责实现从竞品 opencode 借鉴的权限控制系统，让用户能够控制AI的操作边界。

## 核心任务
**创建 PermissionMiddleware + 权限配置UI + 与现有Adapter层的集成。**

## ⚠️ 重要提示
这是一个 **原型/实验性功能**，优先级低于其他窗口。如果时间不够，可以只实现核心中间件层，UI部分简化处理。

## 必读文档
1. **`DEVELOPMENT.md`** - 项目协作文档（MASTER DOCUMENT）
2. **Window 1 的产出** - PluginManager（权限检查需要集成到adapter层）
3. **opencode 的设计参考** (下面会提供关键代码片段)

## 背景知识：为什么需要权限系统？

### 现状风险
```typescript
// 当前 ClaudeCodeAdapter 的 MCP tool handler:
case 'prism_write_decision':
  // 直接写入文件！没有任何检查！
  await writeADR(currentProjectRoot, args);
  break;

// 如果AI被prompt injection攻击，可能：
// 1. 删除重要文件
// 2. 执行恶意shell命令  
// 3. 泄露敏感信息
```

### 目标状态
```typescript
// 新的流程：每个操作都经过权限检查
case 'prism_write_decision': {
  // 1. 检查是否有权限
  const { allowed } = await permissionMiddleware.checkPermission('file.write', {
    path: args.filePath,
    operation: 'write'
  });
  
  if (!allowed) {
    return { content: 'Operation denied by permission policy', isError: true };
  }
  
  // 2. 有权限才执行
  return await writeADR(currentProjectRoot, args);
}
```

## 具体工作清单

### Step 1: 定义权限数据模型 (45分钟)

**文件**: `electron/adapters/permission-types.ts`

```typescript
/**
 * Prism Permission System - Type Definitions
 * 
 * 借鉴自 opencode 的权限模型，但适配Prism的GUI特性
 */

/** 权限级别 */
export type PermissionLevel = 'allow' | 'deny' | 'ask' | 'confirm';

/** 工具类别（用于批量设置） */
export type ToolCategory = 
  | 'file.read'      // 读取文件
  | 'file.write'     // 写入/创建文件
  | 'file.delete'    // 删除文件
  | 'shell.execute'  // 执行shell命令
  | 'mcp.*'          // MCP工具调用
  | 'web.fetch'      // 网络请求
  | 'ide.control';   // IDE控制（打开文件等）

/** 完整的权限配置 */
export interface PermissionConfig {
  /** 版本号（用于迁移） */
  version: number;
  
  /** 最后更新时间 */
  updatedAt: string;
  
  /** 全局默认策略 */
  default: PermissionLevel;
  
  /** 按工具类别的权限覆盖 */
  tools: Partial<Record<ToolCategory, PermissionLevel>>;
  
  /** 特定工具的精细控制 */
  specificTools?: {
    'prism_ask_user': 'allow';        // 始终允许（核心交互）
    'prism_read_context': 'allow';     // 只读操作
    'prism_write_decision': 'ask';     // 需要确认
    'prism_update_task': 'allow';      // 允许
    [toolName: string]: PermissionLevel;
  };
  
  /** 按路径模式的规则（支持glob） */
  pathRules?: Array<{
    id: string;
    pattern: string;           // glob模式, 如 "*.env", "src/**"
    permission: PermissionLevel;
    description?: string;       // 为什么有这个规则
    createdAt: string;
  }>;
  
  /** 时间窗口限制（可选） */
  timeRestrictions?: {
    /** 仅在工作时间允许危险操作 */
    workHoursOnly?: boolean;
    /** 工作时间范围 (24h格式) */
    allowedHours?: [number, number]; // [9, 18] = 9:00-18:00
  };
}

/** 权限检查结果 */
export interface PermissionCheckResult {
  /** 是否允许 */
  allowed: boolean;
  
  /** 需要用户确认（ask/confirm级别） */
  requiresConfirmation?: boolean;
  
  /** 拒绝原因（如果被拒绝） */
  reason?: string;
  
  /** 匹配到的规则ID（用于审计） */
  matchedRuleId?: string;
  
  /** 建议的用户操作 */
  suggestion?: {
    type: 'change_setting' | 'override_once' | 'learn_more';
    message: string;
  };
}

/** 权限事件（用于审计日志） */
export interface PermissionEvent {
  timestamp: Date;
  action: ToolCategory | string;
  target?: string;           // 文件路径或命令
  result: 'allowed' | 'denied' | 'confirmed';
  level: PermissionLevel;
  sessionId?: string;
  userId?: string;           // 未来多用户支持
}
```

### Step 2: 实现权限中间件 (2小时)

**文件**: `electron/adapters/permission-middleware.ts`

这是核心逻辑层，所有权限检查都通过这里。

```typescript
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch'; // 使用minimatch做glob匹配

import type {
  PermissionConfig,
  PermissionCheckResult,
  PermissionLevel,
  PermissionEvent,
  ToolCategory,
} from './permission-types';

/** 默认权限配置 */
const DEFAULT_CONFIG: PermissionConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  default: 'ask',  // 默认询问用户，最安全
  
  tools: {
    'file.read': 'allow',       // 读文件通常安全
    'file.write': 'ask',        // 写文件需要确认
    'file.delete': 'deny',      // 删除默认禁止
    'shell.execute': 'deny',    // shell命令很危险
    'mcp.prism_ask_user': 'allow',
    'mcp.prism_read_context': 'allow',
    'mcp.prism_write_decision': 'ask',
    'mcp.prism_update_task': 'allow',
    'web.fetch': 'ask',         // 网络请求需要确认
    'ide.control': 'allow',     // 控制IDE通常OK
  },
  
  pathRules: [
    {
      id: 'protect-env-files',
      pattern: '.env*',
      permission: 'deny',
      description: 'Protect environment files from modification',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'protect-config',
      pattern: '*.{json,yaml,yml,toml,lock}',
      permission: 'ask',
      description: 'Configuration files need confirmation to modify',
      createdAt: new Date().toISOString(),
    },
  ],
};

/**
 * PermissionMiddleware - 权限检查中间件
 * 
 * 用法:
 * ```typescript
 * const middleware = new PermissionMiddleware(config, askUserFn);
 * 
 * // 在执行敏感操作前:
 * const result = await middleware.check('file.write', { path: '/src/foo.ts' });
 * if (!result.allowed) {
 *   return denyResponse;
 * }
 * // 继续执行...
 * ```
 */
export class PermissionMiddleware extends EventEmitter {
  private config: PermissionConfig;
  private askUserCallback: (question: any) => Promise<any>;
  private eventLog: PermissionEvent[] = [];
  private maxLogSize: number = 1000;

  constructor(
    config?: Partial<PermissionConfig>,
    askUserCallback: (question: any) => Promise<any>
  ) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.askUserCallback = askUserCallback;
  }

  /**
   * 核心方法：检查某个操作是否被允许
   */
  async checkPermission(
    action: ToolCategory | string,
    details?: {
      path?: string;
      command?: string;
      url?: string;
      toolName?: string;
      [key: string]: any;
    }
  ): Promise<PermissionCheckResult> {
    const startTime = Date.now();
    
    try {
      // 1. 检查全局默认策略
      let effectiveLevel = this.config.default;
      
      // 2. 检查工具类别级别
      if (action in this.config.tools) {
        effectiveLevel = this.config.tools[action as ToolCategory] || effectiveLevel;
      }
      
      // 3. 检查特定工具级别（更精确）
      if (details?.toolName && this.config.specificTools?.[details.toolName]) {
        effectiveLevel = this.config.specificTools[details.toolName];
      }
      
      // 4. 检查路径规则（如果有提供path）
      if (details?.path && this.config.pathRules) {
        const pathResult = this.checkPathRules(details.path);
        if (pathResult !== null) {
          effectiveLevel = pathResult;
        }
      }
      
      // 5. 根据最终级别决定结果
      switch (effectiveLevel) {
        case 'allow':
          return this.createResult(true, action, details, effectiveLevel);
          
        case 'deny':
          return this.createResult(false, action, details, effectiveLevel, {
            reason: `Operation '${action}' is denied by security policy`,
            suggestion: {
              type: 'change_settings' as const,
              message: 'You can change this in Settings > Permissions',
            },
          });
          
        case 'ask': {
          // 向用户提问，等待回复
          const answer = await this.promptUser(action, details, effectiveLevel);
          
          if (answer === true || answer?.allowed) {
            return this.createResult(true, action, details, effectiveLevel);
          } else {
            return this.createResult(false, action, details, effectiveLevel, {
              reason: 'User denied the operation',
            });
          }
        }
          
        case 'confirm': {
          // 只需确认，不给拒绝选项
          await this.confirmAction(action, details);
          return this.createResult(true, action, details, effectiveLevel, {
            requiresConfirmation: true,
          });
        }
        
        default:
          return this.createResult(true, action, details, effectiveLevel); // 未知级别默认允许
      }
      
    } catch (error: any) {
      console.error('[PermissionMiddleware] Error checking permission:', error);
      // 出错时默认允许（避免阻塞正常工作流）
      return {
        allowed: true,
        requiresConfirmation: false,
        reason: `Permission check failed: ${error.message}`,
      };
    } finally {
      // 记录审计日志
      this.logEvent({
        timestamp: new Date(),
        action,
        target: details?.path || details?.command,
        result: 'allowed', // 这里是简化的，实际应该基于上面结果
        level: effectiveLevel,
      });
    }
  }

  /**
   * 检查路径匹配规则
   */
  private checkPathRules(filePath: string): PermissionLevel | null {
    if (!this.config.pathRules) return null;
    
    // 从后往前匹配（更具体的规则优先）
    for (let i = this.config.pathRules.length - 1; i >= 0; i--) {
      const rule = this.config.pathRules[i];
      if (minimatch(filePath, rule.pattern)) {
        return rule.permission;
      }
    }
    
    return null; // 没有匹配任何规则
  }

  /**
   * 向用户提问（ask级别）
   */
  private async promptUser(
    action: string,
    details: any,
    level: PermissionLevel
  ): Promise<any> {
    const question = {
      type: 'permission' as const,
      title: `Allow ${action}?`,
      question: this.formatQuestionText(action, details),
      options: [
        {
          label: '✅ Allow once',
          input: { once: true, permanent: false },
        },
        {
          label: '✅ Allow for session',
          input: { once: false, permanent: false, duration: 'session' },
        },
        {
          label: '⚙️ Always allow this',
          input: { once: false, permanent: true },
        },
        {
          label: '🚫 Deny',
          input: { deny: true },
        },
      ],
      severity: this.getSeverityForAction(action),
    };

    return await this.askUserCallback(question);
  }

  /**
   * 请求确认（confirm级别）
   */
  private async confirmAction(action: string, details: any): Promise<void> {
    const confirmQuestion = {
      type: 'confirm' as const,
      title: `Confirm ${action}`,
      question: this.formatConfirmationText(action, details),
    };

    await this.askUserCallback(confirmQuestion);
  }

  /**
   * 格式化问题文本
   */
  private formatQuestionText(action: string, details: any): string {
    const parts: string[] = [`Do you want to allow this ${action} operation?`];
    
    if (details?.path) {
      parts.push(`Target file: ${details.path}`);
    }
    if (details?.command) {
      parts.push(`Command: ${details.command}`);
      // 安全警告
      if (action === 'shell.execute') {
        parts.push('⚠️ Shell commands can modify your system. Review carefully.');
      }
    }
    
    return parts.join('\n');
  }

  private formatConfirmationText(action: string, details: any): string {
    return `Please confirm you want to proceed with: ${action}${details?.path ? ` on ${details.path}` : ''}`;
  }

  private getSeverityForAction(action: string): 'error' | 'warning' | 'info' {
    const dangerousActions = ['file.delete', 'shell.execute'];
    if (dangerousActions.includes(action)) return 'error';
    if (action.startsWith('web.')) return 'warning';
    return 'info';
  }

  /**
   * 创建标准化结果对象
   */
  private createResult(
    allowed: boolean,
    action: string,
    details: any,
    level: PermissionLevel,
    extras?: Partial<PermissionCheckResult>
  ): PermissionCheckResult {
    return {
      allowed,
      requiresConfirmation: level === 'confirm',
      ...extras,
    };
  }

  /**
   * 记录审计事件
   */
  private logEvent(event: Omit<PermissionEvent, 'result'>): void {
    const fullEvent: PermissionEvent = {
      ...event,
      result: event.action, // 简化，实际应该是检查结果
    };

    this.eventLog.push(fullEvent);
    this.emit('permission-checked', fullEvent);

    // 保持日志大小限制
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
  }

  // ---------------------------------------------------------------------------
  // 配置管理
  // ---------------------------------------------------------------------------

  /**
   * 更新权限配置
   */
  updateConfig(updates: Partial<PermissionConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.emit('config-updated', this.config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): PermissionConfig {
    return { ...this.config };
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.emit('config-reset');
  }

  /**
   * 导出配置为JSON（用于持久化）
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 从JSON导入配置
   */
  importConfig(jsonString: string): void {
    try {
      const imported = JSON.parse(jsonString);
      this.config = { ...DEFAULT_CONFIG, ...imported };
      this.emit('config-imported');
    } catch (error: any) {
      throw new Error(`Invalid config JSON: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 审计日志
  // ---------------------------------------------------------------------------

  /**
   * 获取最近的权限事件
   */
  getRecentEvents(limit = 50): PermissionEvent[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * 清空日志
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * 获取统计摘要
   */
  getStats(): {
    totalChecks: number;
    allowedCount: number;
    deniedCount: number;
    askedCount: number;
    topBlockedActions: Array<{ action: string; count: number }>;
  } {
    const total = this.eventLog.length;
    const allowed = this.eventLog.filter(e => e.result === 'allowed').length;
    const denied = total - allowed;
    
    // 统计被拒最多的操作
    const actionCounts = new Map<string, number>();
    this.eventLog.forEach(e => {
      actionCounts.set(e.action, (actionCounts.get(e.action) || 0) + 1);
    });
    
    const topBlocked = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalChecks: total,
      allowedCount: allowed,
      deniedCount: denied,
      askedCount: this.eventLog.filter(e => e.level === 'ask').length,
      topBlockedActions: topBlocked,
    };
  }
}

// 导出工厂函数
export function createPermissionMiddleware(
  config?: Partial<PermissionConfig>,
  askUserCallback: (question: any) => Promise<any>
): PermissionMiddleware {
  return new PermissionMiddleware(config, askUserCallback);
}
```

### Step 3: 创建权限配置UI组件 (2小时)

**文件**: `src/components/settings/PermissionPanel.tsx`

这是一个设置页面中的面板，让用户可视化地管理权限。

**UI布局**:

```
┌─────────────────────────────────────────────┐
│  🔒 Permission Settings                     │
│                                             │
│  Global Default Behavior:                    │
│  ┌───────────────────────────────────┐      │
│  │ ○ Allow all                        │      │
│  │ ● Ask before each operation (Safe) │ ← 推荐│
│  │ ○ Require confirmation            │      │
│  │ ○ Block all (Lockdown mode)       │      │
│  └───────────────────────────────────┘      │
│                                             │
│  Tool-Specific Permissions:                 │
│  ┌────────────────────┬─────────┬────────┐ │
│  │ Operation         │ Level   │ Risk   │ │
│  ├────────────────────┼─────────┼────────┤ │
│  │ 📖 Read Files      │ ✅ Allow │ 🟢 Low │ │
│  │ ✏️ Write Files     │ ❓ Ask   │ 🟡 Med │ │
│  │ 🗑️ Delete Files    │ 🚫 Deny  │ 🔴 High│ │
│  │ ⚡ Shell Commands  │ 🚫 Deny  │ 🔴 High│ │
│  │ 🌐 Web Requests    │ ❓ Ask   │ 🟡 Med │ │
│  │ 🎮 Control IDE     │ ✅ Allow │ 🟢 Low │ │
│  └────────────────────┴─────────┴────────┘ │
│                                             │
│  Path-Based Rules (Advanced):                │
│  ┌──────────────────────────────────────┐   │
│  │ Pattern          │ Action   │ Del    │   │
│  ├──────────────────────────────────────┤   │
│  │ *.env             │ 🚫 Deny   │ 🗑️     │   │
│  │ *.{json,yaml}     │ ❓ Ask    │ 🗑️     │   │
│  │ node_modules/     │ 🚫 Deny   │ 🗑️     │   │
│  │ + Add Rule...                          │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Recent Activity:                            │
│  ┌──────────────────────────────────────┐   │
│  │ 14:32  file.write /src/auth.ts → ✅   │   │
│  │ 14:30  shell.execute npm test → 🚫     │   │
│  │ 14:28  web.fetch api.example.com → ✅  │   │
│  │ [View Full Log...]                     │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  [Reset to Defaults]  [Export Config]       │
└─────────────────────────────────────────────┘
```

**核心功能**:
1. 全局策略单选切换
2. 工具权限下拉选择（4个选项）
3. 路径规则的增删改
4. 最近活动实时显示（每10秒刷新）
5. 配置导出/导入/重置

### Step 4: 集成到 Adapter 层 (1.5小时)

修改 `ClaudeCodeAdapter.ts` 的 MCP tool handler：

```typescript
// 在 ClaudeCodeAdapter 类中添加:

private permissionMiddleware: PermissionMiddleware | null = null;

/**
 * 设置权限中间件（在main.ts初始化时调用）
 */
setPermissionMiddleware(middleware: PermissionMiddleware): void {
  this.permissionMiddleware = middleware;
}

// 在 setupMcpServer() 的 CallToolRequestSchema handler 中:

this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments as any;
  
  // 🔒 NEW: 权限检查（如果中间件已设置）
  if (this.permissionMiddleware) {
    // 将MCP工具名映射到权限类别
    const actionMap: Record<string, string> = {
      'prism_write_decision': 'file.write',
      'prism_read_context': 'file.read',
      'prism_update_task': 'file.write',
      // ... 其他映射
    };
    
    const permissionAction = actionMap[request.params.name] || 'mcp.unknown';
    
    const result = await this.permissionMiddleware.checkPermission(permissionAction, {
      toolName: request.params.name,
      ...args,
    });
    
    if (!result.allowed) {
      return {
        content: [{ 
          type: 'text', 
          text: `🚫 Operation blocked by permission policy.\n\n${result.reason || ''}\n\nYou can change this in Settings > Permissions.` 
        }],
        isError: true,
      };
    }
    
    if (result.requiresConfirmation) {
      // 操作已确认，继续执行（日志已记录）
    }
  }

  // ... 原有的tool处理逻辑（不变）
});
```

同样需要在 `AntigravityAdapter`、`CursorAdapter` 等其他适配器中添加类似的集成点。

### Step 5: 编写测试 (1小时)

**文件**: `electron/adapters/__tests__/permission-middleware.test.ts`

必须测试的场景：
1. ✅ allow级别直接放行
2. ✅ deny级别直接拒绝并返回原因
3. ✅ ask级别调用回调函数
4. ✅ confirm级别只确认不拒绝
5. ✅ 路径规则正确匹配（使用minimatch）
6. ✅ 路径规则优先级（更具体的规则优先生效）
7. ✅ 配置更新和导出/导入
8. ✅ 审计日志记录和查询
9. ✅ 错误时降级为允许（不阻塞）

### Step 6: 持久化集成 (30分钟)

将权限配置保存到项目目录 `.prism/permissions.json`：

```typescript
// 在 main.ts 中添加 IPC handler:

ipcMain.handle('get_permission_config', async () => {
  const middleware = getPermissionMiddleware(); // 需要从某处获取实例
  return middleware?.getConfig() || DEFAULT_CONFIG;
});

ipcMain.handle('update_permission_config', async (_event, updates) => {
  const middleware = getPermissionMiddleware();
  middleware?.updateConfig(updates);
  
  // 持久化到文件
  const configPath = path.join(projectRoot, '.prism', 'permissions.json');
  await fs.writeFile(configPath, JSON.stringify(middleware.getConfig(), null, 2));
  
  return { success: true };
});

ipcMain.handle('reset_permission_config', async () => {
  const middleware = getPermissionMiddleware();
  middleware?.resetToDefaults();
  return { success: true };
});
```

## 交付物

### 必须提交
1. **permission-types.ts** - 类型定义
2. **permission-middleware.ts** - 核心中间件类
3. **PermissionPanel.tsx** - UI组件
4. **permission-middleware.test.ts** - 单元测试
5. **集成代码** - Adapter层的权限检查集成
6. **更新 DEVELOPMENT.md**

### 可选
7. **权限向导组件** - 首次使用时的引导
8. **审计报告导出** - CSV/JSON格式的权限日志导出

## 简化方案（如果时间不足）

如果无法完成全部功能，按以下优先级裁剪：

**最小可用版本 (MVP)**:
1. ✅ 实现 PermissionMiddleware 核心（allow/deny/ask 三种级别）
2. ✅ 在 ClaudeCodeAdapter 的 2-3 个敏感工具上集成
3. ✅ 基础的配置UI（全局策略 + 工具列表）
4. ❌ 路径规则（后续版本）
5. ❌ 审计日志（后续版本）
6. ❌ 时间窗口限制（后续版本）

## 完成信号

```
✅ PermissionMiddleware 类完整实现并通过测试
✅ 至少在一个Adapter中集成了权限检查
✅ 基础UI可显示和修改权限配置
✅ 权限配置可持久化和恢复
✅ 无TypeScript编译错误
✅ 测试覆盖率 > 85%
```

**开始工作吧！建议先实现中间件核心逻辑，再考虑UI和集成。**
