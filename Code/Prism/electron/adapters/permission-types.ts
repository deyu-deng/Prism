/**
 * Prism Permission System - Type Definitions
 *
 * 借鉴自 opencode 的权限模型，适配 Prism 的 GUI 特性。
 * 提供完整的权限数据模型，支持多级权限控制、路径规则和审计日志。
 */

/** 权限级别 */
export type PermissionLevel = 'allow' | 'deny' | 'ask' | 'confirm';

/** 所有有效的权限级别 */
export const PERMISSION_LEVELS: readonly PermissionLevel[] = [
  'allow',
  'deny',
  'ask',
  'confirm',
] as const;

/** 工具类别（用于批量设置权限） */
export type ToolCategory =
  | 'file.read'
  | 'file.write'
  | 'file.delete'
  | 'shell.execute'
  | 'mcp.call'
  | 'web.fetch'
  | 'ide.control'
  | (string & {}); // 允许自定义工具名

/** 预定义的工具类别列表（用于UI展示） */
export const TOOL_CATEGORIES: readonly {
  key: ToolCategory;
  label: string;
  icon: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
}[] = [
  { key: 'file.read', label: 'Read Files', icon: '\uD83D\uDCC4', risk: 'low', description: '读取文件内容' },
  { key: 'file.write', label: 'Write Files', icon: '\u270F\uFE0F', risk: 'medium', description: '写入或创建文件' },
  { key: 'file.delete', label: 'Delete Files', icon: '\uD83D\uDDD1\uFE0F', risk: 'high', description: '删除文件' },
  { key: 'shell.execute', label: 'Shell Commands', icon: '\u26A1', risk: 'high', description: '执行 shell 命令' },
  { key: 'mcp.call', label: 'MCP Tools', icon: '\uD83E\uDD16', risk: 'medium', description: '调用 MCP 工具' },
  { key: 'web.fetch', label: 'Web Requests', icon: '\uD83C\uDF10', risk: 'medium', description: '发起网络请求' },
  { key: 'ide.control', label: 'Control IDE', icon: '\uD83C\uDFAE', risk: 'low', description: '控制 IDE 操作' },
] as const;

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
  specificTools?: Record<string, PermissionLevel>;

  /** 按路径模式的规则（支持 glob） */
  pathRules?: Array<{
    id: string;
    pattern: string;
    permission: PermissionLevel;
    description?: string;
    createdAt: string;
  }>;

  /** 时间窗口限制（可选，后续版本实现） */
  timeRestrictions?: {
    workHoursOnly?: boolean;
    allowedHours?: [number, number];
  };
}

/** 权限检查结果 */
export interface PermissionCheckResult {
  /** 是否允许 */
  allowed: boolean;

  /** 是否需要用户确认（ask/confirm 级别触发后用户同意时为 true） */
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
  action: string;
  target?: string;
  result: 'allowed' | 'denied' | 'confirmed';
  level: PermissionLevel;
  sessionId?: string;
  matchedRuleId?: string;
}

/** 用户提问的选项（ask 级别使用） */
export interface PermissionPromptOption {
  label: string;
  input: {
    once?: boolean;
    permanent?: boolean;
    deny?: boolean;
  };
}

/** 向用户展示的权限提示问题 */
export interface PermissionPromptQuestion {
  type: 'permission';
  title: string;
  question: string;
  options: PermissionPromptOption[];
  severity: 'error' | 'warning' | 'info';
}

/** 确认级别的问题 */
export interface PermissionConfirmQuestion {
  type: 'confirm';
  title: string;
  question: string;
}

/** 用户回调函数签名 */
export type AskUserCallback = (
  question: PermissionPromptQuestion | PermissionConfirmQuestion
) => Promise<any>;
