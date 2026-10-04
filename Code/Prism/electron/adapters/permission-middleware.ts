/**
 * PermissionMiddleware - 权限检查中间件
 *
 * 核心逻辑层，所有权限检查都通过这里。
 * 借鉴自 opencode 的权限模型，适配 Prism 的 GUI 特性。
 *
 * 用法:
 * ```typescript
 * const middleware = new PermissionMiddleware(config, askUserFn);
 *
 * // 在执行敏感操作前:
 * const result = await middleware.checkPermission('file.write', { path: '/src/foo.ts' });
 * if (!result.allowed) {
 *   return denyResponse;
 * }
 * // 继续执行...
 * ```
 */

import { EventEmitter } from 'node:events';
import type {
  PermissionConfig,
  PermissionCheckResult,
  PermissionLevel,
  PermissionEvent,
  PermissionPromptQuestion,
  PermissionConfirmQuestion,
  AskUserCallback,
  ToolCategory,
} from './permission-types';

/** 默认权限配置 */
const DEFAULT_CONFIG: PermissionConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  default: 'ask',

  tools: {
    'file.read': 'allow',
    'file.write': 'ask',
    'file.delete': 'deny',
    'shell.execute': 'deny',
    'mcp.call': 'ask',
    'web.fetch': 'ask',
    'ide.control': 'allow',
  },

  specificTools: {
    prism_ask_user: 'allow',
    prism_read_context: 'allow',
    prism_write_decision: 'ask',
    prism_update_task: 'allow',
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
      id: 'protect-config-files',
      pattern: '*.{json,yaml,yml,toml,lock}',
      permission: 'ask',
      description: 'Configuration files need confirmation to modify',
      createdAt: new Date().toISOString(),
    },
  ],
};

/** MCP 工具名到权限类别的映射 */
const MCP_TOOL_ACTION_MAP: Record<string, string> = {
  prism_write_decision: 'file.write',
  prism_read_context: 'file.read',
  prism_update_task: 'file.write',
  prism_ask_user: 'mcp.call',
};

export class PermissionMiddleware extends EventEmitter {
  private config: PermissionConfig;
  private askUserCallback: AskUserCallback;
  private eventLog: PermissionEvent[] = [];
  private maxLogSize: number;

  constructor(
    config?: Partial<PermissionConfig>,
    askUserCallback?: AskUserCallback
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.askUserCallback = askUserCallback ?? (() => Promise.resolve(true));
    this.maxLogSize = 1000;
  }

  /**
   * 核心方法：检查某个操作是否被允许
   *
   * 检查优先级（从低到高）：
   * 1. 全局默认策略
   * 2. 工具类别级别覆盖
   * 3. 特定工具级别（最精确）
   * 4. 路径规则匹配（最高优先级）
   */
  async checkPermission(
    action: ToolCategory | string,
    details?: {
      path?: string;
      command?: string;
      url?: string;
      toolName?: string;
      [key: string]: unknown;
    }
  ): Promise<PermissionCheckResult> {
    let effectiveLevel: PermissionLevel;
    let matchedRuleId: string | undefined;

    try {
      effectiveLevel = this.resolveEffectiveLevel(action, details);
      matchedRuleId = this.findMatchedRuleId(action, details);

      return await this.evaluateLevel(
        effectiveLevel,
        action,
        details,
        matchedRuleId
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[PermissionMiddleware] Error checking permission:', error);
      // 错误时降级为允许，不阻塞正常工作流
      this.logEvent({
        timestamp: new Date(),
        action,
        target: details?.path as string | undefined || details?.command as string | undefined,
        result: 'allowed',
        level: 'allow',
        matchedRuleId,
      });
      return {
        allowed: true,
        reason: `Permission check failed (degraded to allow): ${message}`,
      };
    }
  }

  /**
   * 解析有效的权限级别（不触发用户交互）
   */
  resolveEffectiveLevel(
    action: ToolCategory | string,
    details?: { path?: string; toolName?: string; [key: string]: unknown }
  ): PermissionLevel {
    let level = this.config.default;

    // 2. 工具类别级别
    if (action in this.config.tools) {
      const toolLevel = this.config.tools[action as ToolCategory];
      if (toolLevel) {
        level = toolLevel;
      }
    }

    // 3. 特定工具级别（更精确）
    const toolName = details?.toolName as string | undefined;
    if (toolName && this.config.specificTools?.[toolName]) {
      level = this.config.specificTools[toolName];
    }

    // 4. 路径规则匹配（最高优先级）
    const pathResult = this.checkPathRules(details?.path as string | undefined);
    if (pathResult !== null) {
      level = pathResult.level;
    }

    return level;
  }

  /**
   * 根据最终级别决定结果
   */
  private async evaluateLevel(
    effectiveLevel: PermissionLevel,
    action: string,
    details?: { path?: string; command?: string; [key: string]: unknown },
    matchedRuleId?: string
  ): Promise<PermissionCheckResult> {
    switch (effectiveLevel) {
      case 'allow':
        this.logEvent({
          timestamp: new Date(),
          action,
          target: details?.path as string | undefined || details?.command as string | undefined,
          result: 'allowed',
          level: effectiveLevel,
          matchedRuleId,
        });
        return { allowed: true, matchedRuleId };

      case 'deny':
        this.logEvent({
          timestamp: new Date(),
          action,
          target: details?.path as string | undefined || details?.command as string | undefined,
          result: 'denied',
          level: effectiveLevel,
          matchedRuleId,
        });
        return {
          allowed: false,
          reason: `Operation '${action}' is denied by security policy`,
          matchedRuleId,
          suggestion: {
            type: 'change_setting' as const,
            message: 'You can change this in Settings > Permissions',
          },
        };

      case 'ask': {
        const answer = await this.promptUser(action, details, effectiveLevel);

        if (answer === true || answer?.allowed === true) {
          this.logEvent({
            timestamp: new Date(),
            action,
            target: details?.path as string | undefined || details?.command as string | undefined,
            result: 'confirmed',
            level: effectiveLevel,
            matchedRuleId,
          });
          return { allowed: true, requiresConfirmation: true, matchedRuleId };
        } else {
          this.logEvent({
            timestamp: new Date(),
            action,
            target: details?.path as string | undefined || details?.command as string | undefined,
            result: 'denied',
            level: effectiveLevel,
            matchedRuleId,
          });
          return {
            allowed: false,
            reason: 'User denied the operation',
            matchedRuleId,
          };
        }
      }

      case 'confirm':
        await this.confirmAction(action, details);
        this.logEvent({
          timestamp: new Date(),
          action,
          target: details?.path as string | undefined || details?.command as string | undefined,
          result: 'confirmed',
          level: effectiveLevel,
          matchedRuleId,
        });
        return { allowed: true, requiresConfirmation: true, matchedRuleId };

      default:
        // 未知级别默认允许
        this.logEvent({
          timestamp: new Date(),
          action,
          target: details?.path as string | undefined || details?.command as string | undefined,
          result: 'allowed',
          level: 'allow',
          matchedRuleId,
        });
        return { allowed: true };
    }
  }

  /**
   * 检查路径匹配规则
   */
  private checkPathRules(filePath?: string): { level: PermissionLevel; ruleId: string } | null {
    if (!filePath || !this.config.pathRules || this.config.pathRules.length === 0) {
      return null;
    }

    // 从后往前匹配（更具体的规则/后添加的规则优先）
    for (let i = this.config.pathRules.length - 1; i >= 0; i--) {
      const rule = this.config.pathRules[i];
      if (this.matchGlob(filePath, rule.pattern)) {
        return { level: rule.permission, ruleId: rule.id };
      }
    }

    return null;
  }

  /**
   * 查找匹配的规则ID
   */
  private findMatchedRuleId(
    action: string,
    details?: { path?: string; toolName?: string; [key: string]: unknown }
  ): string | undefined {
    const pathResult = this.checkPathRules(details?.path as string | undefined);
    return pathResult?.ruleId;
  }

  /**
   * 简化的 glob 匹配（无需 minimatch 依赖）
   * 支持: *.ext, .env*, *, **, ? 等基本模式
   */
  private matchGlob(filePath: string, pattern: string): boolean {
    const basename = filePath.split(/[/\\]/).pop() ?? filePath;

    // 处理 *.ext 格式
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1); // .ext 或 .{json,yaml}
      // 支持大括号扩展如 *.{json,yaml}
      if (ext.startsWith('.')) {
        const extPattern = ext.replace(/^\./, '');
        // 简单的大括号展开
        if (extPattern.includes('{')) {
          const match = extPattern.match(/^\{([^}]+)\}$/);
          if (match) {
            const extensions = match[1].split(',');
            return extensions.some((ext) => basename.endsWith(`.${ext.trim()}`));
          }
        }
        return basename.endsWith(ext);
      }
    }

    // 处理 .env* 格式
    if (pattern.startsWith('.env')) {
      return basename.startsWith('.env');
    }

    // 处理精确匹配或前缀匹配
    if (pattern.endsWith('*') && !pattern.includes('.') && !pattern.includes('?')) {
      return basename.startsWith(pattern.slice(0, -1));
    }

    // 精确匹配
    return basename === pattern || filePath === pattern;
  }

  /**
   * 向用户提问（ask 级别）
   */
  private async promptUser(
    action: string,
    details: { path?: string; command?: string; [key: string]: unknown } | undefined,
    _level: PermissionLevel
  ): Promise<any> {
    const question: PermissionPromptQuestion = {
      type: 'permission',
      title: `Allow ${action}?`,
      question: this.formatQuestionText(action, details),
      options: [
        {
          label: '\u2705 Allow once',
          input: { once: true, permanent: false },
        },
        {
          label: '\u2705 Allow for session',
          input: { once: false, permanent: false },
        },
        {
          label: '\u2699\uFE0F Always allow this',
          input: { once: false, permanent: true },
        },
        {
          label: '\uD83D\uDED1 Deny',
          input: { deny: true },
        },
      ],
      severity: this.getSeverityForAction(action),
    };

    return await this.askUserCallback(question);
  }

  /**
   * 请求确认（confirm 级别）
   */
  private async confirmAction(
    action: string,
    details: { path?: string; command?: string; [key: string]: unknown } | undefined
  ): Promise<void> {
    const confirmQuestion: PermissionConfirmQuestion = {
      type: 'confirm',
      title: `Confirm ${action}`,
      question: this.formatConfirmationText(action, details),
    };

    await this.askUserCallback(confirmQuestion);
  }

  /**
   * 格式化问题文本
   */
  private formatQuestionText(
    action: string,
    details: { path?: string; command?: string; [key: string]: unknown } | undefined
  ): string {
    const parts: string[] = [`Do you want to allow this ${action} operation?`];

    if (details?.path) {
      parts.push(`Target file: ${details.path as string}`);
    }
    if (details?.command) {
      parts.push(`Command: ${details.command as string}`);
      if (action === 'shell.execute') {
        parts.push('\u26A0\uFE0F Shell commands can modify your system. Review carefully.');
      }
    }

    return parts.join('\n');
  }

  /**
   * 格式化确认文本
   */
  private formatConfirmationText(
    action: string,
    details: { path?: string; command?: string; [key: string]: unknown } | undefined
  ): string {
    return `Please confirm you want to proceed with: ${action}${details?.path ? ` on ${details.path as string}` : ''}`;
  }

  /**
   * 根据操作类型获取严重程度
   */
  private getSeverityForAction(action: string): 'error' | 'warning' | 'info' {
    const dangerousActions = ['file.delete', 'shell.execute'];
    if (dangerousActions.includes(action)) return 'error';
    if (action.startsWith('web.')) return 'warning';
    return 'info';
  }

  /**
   * 记录审计事件
   */
  private logEvent(event: Omit<PermissionEvent, 'result'> & { result: PermissionEvent['result'] }): void {
    this.eventLog.push(event as PermissionEvent);
    this.emit('permission-checked', event);

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
    this.emit('config-updated', this.getConfig());
  }

  /**
   * 获取当前配置（深拷贝）
   */
  getConfig(): PermissionConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    this.emit('config-reset', this.getConfig());
  }

  /**
   * 导出配置为 JSON 字符串（用于持久化）
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 从 JSON 字符串导入配置
   */
  importConfig(jsonString: string): void {
    try {
      const imported = JSON.parse(jsonString) as Partial<PermissionConfig>;
      this.config = { ...DEFAULT_CONFIG, ...imported, updatedAt: new Date().toISOString() };
      this.emit('config-imported', this.getConfig());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid config JSON: ${message}`);
    }
  }

  /**
   * 更新单个工具类别的权限级别
   */
  setToolPermission(category: ToolCategory | string, level: PermissionLevel): void {
    if (!this.config.tools) {
      this.config.tools = {};
    }
    this.config.tools[category] = level;
    this.updateConfig({ tools: this.config.tools });
  }

  /**
   * 更新全局默认策略
   */
  setDefaultLevel(level: PermissionLevel): void {
    this.config.default = level;
    this.updateConfig({ default: level });
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
   * 清空审计日志
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
    const allowed = this.eventLog.filter((e) => e.result === 'allowed').length;
    const denied = this.eventLog.filter((e) => e.result === 'denied').length;
    const asked = this.eventLog.filter((e) => e.level === 'ask').length;

    const actionCounts = new Map<string, number>();
    for (const e of this.eventLog) {
      actionCounts.set(e.action, (actionCounts.get(e.action) || 0) + 1);
    }

    const topBlocked = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalChecks: total,
      allowedCount: allowed,
      deniedCount: denied,
      askedCount: topBlocked.length > 0 ? asked : 0,
      topBlockedActions: topBlocked,
    };
  }

  // ---------------------------------------------------------------------------
  // 静态工具方法
  // ---------------------------------------------------------------------------

  /**
   * 获取 MCP 工具名到权限类别的映射
   */
  static getMcpToolActionMap(): Record<string, string> {
    return { ...MCP_TOOL_ACTION_MAP };
  }

  /**
   * 将 MCP 工具名映射为权限动作类别
   */
  static resolveMcpToolAction(toolName: string): string {
    return MCP_TOOL_ACTION_MAP[toolName] || 'mcp.call';
  }

  /** 获取默认配置（用于外部引用） */
  static getDefaultConfig(): PermissionConfig {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建 PermissionMiddleware 实例
 */
export function createPermissionMiddleware(
  config?: Partial<PermissionConfig>,
  askUserCallback?: AskUserCallback
): PermissionMiddleware {
  return new PermissionMiddleware(config, askUserCallback);
}
