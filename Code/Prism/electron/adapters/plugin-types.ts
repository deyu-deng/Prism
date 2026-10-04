/**
 * Prism Plugin System - Core Types
 * 
 * 定义插件化架构的核心接口和类型
 * 支持延迟加载、健康检查、优雅降级
 */

import { IDEAdapter } from './types';

// ---------------------------------------------------------------------------
// 插件元数据
// ---------------------------------------------------------------------------

export interface PluginMetadata {
  /** 唯一标识符 (e.g., 'claude-code', 'cursor') */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 版本号 */
  version: string;
  /** 作者 */
  author?: string;
  /** 依赖的其他插件ID列表 */
  dependencies?: string[];
  /** 是否为实验性功能 */
  experimental?: boolean;
}

// ---------------------------------------------------------------------------
// IDE 检测命令配置
// ---------------------------------------------------------------------------

export interface IDEDetectionConfig {
  /** 检测CLI命令 */
  command: string;
  /** 命令参数（用于 --version 等检测） */
  args?: string[];
  /** 备用检测方法：检查目录是否存在 */
  fallbackDir?: string;
  /** 检测超时时间（毫秒） */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// 插件状态枚举
// ---------------------------------------------------------------------------

export enum PluginStatus {
  /** 未注册 */
  UNREGISTERED = 'unregistered',
  /** 已注册但未加载 */
  REGISTERED = 'registered',
  /** 正在加载中 */
  LOADING = 'loading',
  /** 已加载但未激活（IDE未检测到） */
  LOADED = 'loaded',
  /** 已激活并可用 */
  ACTIVE = 'active',
  /** 激活失败（有错误） */
  ERROR = 'error',
  /** 已禁用（用户手动禁用） */
  DISABLED = 'disabled',
}

// ---------------------------------------------------------------------------
// 插件健康状态
// ---------------------------------------------------------------------------

export interface PluginHealth {
  /** 健康状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 最后检查时间 */
  lastCheck: Date;
  /** 健康详情 */
  details: {
    /** IDE是否可检测 */
    ideDetected: boolean;
    /** CLI工具是否可用 */
    cliAvailable: boolean;
    /** MCP服务器是否运行（如果适用） */
    mcpServerRunning?: boolean;
    /** 文件监控是否正常（如果适用） */
    fileWatcherActive?: boolean;
  };
  /** 错误信息（如果有） */
  error?: string;
  /** 警告信息（如果有） */
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// 插件接口（扩展 IDEAdapter）
// ---------------------------------------------------------------------------

export interface PrismPlugin extends IDEAdapter {
  /** 插件元数据 */
  metadata: PluginMetadata;
  
  /** 当前状态 */
  status: PluginStatus;
  
  /**
   * 检测IDE是否可用
   * 应该快速返回，不阻塞主线程
   */
  detect(projectRoot?: string): Promise<boolean>;
  
  /**
   * 初始化插件（延迟调用）
   * 在这里启动服务器、绑定端口等重量级操作
   */
  initialize?(projectRoot?: string): Promise<void>;
  
  /**
   * 获取插件健康状态
   */
  getHealth?(): Promise<PluginHealth>;
  
  /**
   * 获取IDE检测配置
   */
  getDetectionConfig?(): IDEDetectionConfig;
  
  /**
   * 获取安装/配置指南（当IDE未检测到时显示）
   */
  getInstallationGuide?(): InstallationGuide;
  
  /**
   * 清理资源
   */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// 插件包装器接口（用于包装现有适配器为插件）
// ---------------------------------------------------------------------------

export type PluginConstructor = new (metadata: PluginMetadata) => PrismPlugin;

// ---------------------------------------------------------------------------
// 安装指南
// ---------------------------------------------------------------------------

export interface InstallationGuide {
  /** 标题 */
  title: string;
  /** 步骤列表 */
  steps: Array<{
    title: string;
    description: string;
    command?: string;        // 可复制的命令
    verification?: string;   // 验证命令
  }>;
  /** 官方文档链接 */
  documentationUrl?: string;
  /** 故障排除常见问题 */
  troubleshooting?: Array<{
    problem: string;
    solution: string;
  }>;
}

// ---------------------------------------------------------------------------
// 插件事件
// ---------------------------------------------------------------------------

export type PluginEvent = 
  | { type: 'registered'; pluginId: string }
  | { type: 'loaded'; pluginId: string }
  | { type: 'activated'; pluginId: string }
  | { type: 'deactivated'; pluginId: string }
  | { type: 'error'; pluginId: string; error: Error }
  | { type: 'health-changed'; pluginId: string; health: PluginHealth };

export type PluginEventListener = (event: PluginEvent) => void;

// ---------------------------------------------------------------------------
// PluginManager 配置
// ---------------------------------------------------------------------------

export interface PluginManagerConfig {
  /** 是否自动检测并激活可用的插件 */
  autoDetect?: boolean;
  /** 健康检查间隔（毫秒），0表示不自动检查 */
  healthCheckInterval?: number;
  /** 插件初始化超时时间（毫秒） */
  initTimeout?: number;
  /** 是否在启动时启用所有已注册的插件 */
  enableAllOnStartup?: boolean;
}
