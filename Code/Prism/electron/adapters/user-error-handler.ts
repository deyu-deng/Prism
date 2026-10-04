/**
 * User-Facing Error Handler
 * 
 * 提供用户友好的错误提示和诊断信息
 * 将技术性错误转换为可操作的建议
 */

import { PluginManager } from './PluginManager';
import { IDEHealthCheck, ideHealthCheck } from './ide-health-check';

export interface UserFacingError {
  /** 用户可见的错误标题 */
  title: string;
  /** 用户友好的错误描述 */
  message: string;
  /** 错误类型（用于UI展示不同样式） */
  severity: 'error' | 'warning' | 'info';
  /** 建议的解决方案列表 */
  suggestions: Array<{
    text: string;
    action?: {
      type: 'install' | 'configure' | 'retry' | 'open-url' | 'copy-command';
      payload?: string;
      label: string;
    };
  }>;
  /** 技术详情（可折叠显示） */
  technicalDetails?: string;
  /** 文档链接 */
  documentationUrl?: string;
}

/**
 * 错误分类和映射规则
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  classifier: (match: RegExpMatchArray, context?: any) => UserFacingError;
}> = [
  // CLI not found
  {
    pattern: /command not found|ENOENT/i,
    classifier: (match, context) => ({
      title: 'IDE CLI Tool Not Found',
      message: `The required command line tool for ${context?.ideName || 'this IDE'} is not installed or not in your PATH.`,
      severity: 'error',
      suggestions: [
        {
          text: `Install ${context?.ideName || 'the required tool'}`,
          action: {
            type: 'install',
            payload: context?.pluginId,
            label: 'View Installation Guide',
          },
        },
        {
          text: 'Check if the tool is installed but not in PATH',
          action: {
            type: 'open-url',
            payload: 'https://github.com/search?q=tool+not+found+path',
            label: 'Learn about PATH configuration',
          },
        },
      ],
      technicalDetails: match[0],
    }),
  },

  // Port already in use
  {
    pattern: /EADDRINUSE|port.*already in use/i,
    classifier: (match) => ({
      title: 'Port Already in Use',
      message: 'Another application is using the port that Prism needs. This usually means another Prism instance is running.',
      severity: 'error',
      suggestions: [
        {
          text: 'Close other Prism instances',
          action: {
            type: 'retry',
            label: 'Retry Connection',
          },
        },
        {
          text: 'Check which process is using the port',
          action: {
            type: 'copy-command',
            payload: process.platform === 'win32' 
              ? 'netstat -ano | findstr :1436' 
              : 'lsof -i :1436',
            label: 'Copy Diagnostic Command',
          },
        },
      ],
      technicalDetails: match[0],
    }),
  },

  // Permission denied
  {
    pattern: /EACCES|EPERM|Permission denied/i,
    classifier: (match, context) => ({
      title: 'Permission Denied',
      message: `Prism doesn't have permission to access ${context?.path || 'the required file or directory'}.`,
      severity: 'error',
      suggestions: [
        {
          text: 'Run Prism with administrator privileges (not recommended)',
        },
        {
          text: 'Check file/folder permissions',
          action: {
            type: 'open-url',
            payload: 'https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights',
            label: 'Learn about File Permissions',
          },
        },
      ],
      technicalDetails: match[0],
    }),
  },

  // MCP connection failed
  {
    pattern: /MCP.*fail|SSE.*error|WebSocket.*close/i,
    classifier: (match) => ({
      title: 'MCP Connection Failed',
      message: 'Prism failed to establish a connection with the IDE via the Model Context Protocol.',
      severity: 'warning',
      suggestions: [
        {
          text: 'Restart the IDE and try again',
          action: {
            type: 'retry',
            label: 'Reconnect',
          },
        },
        {
          text: 'Check if the IDE supports MCP protocol',
        },
        {
          text: 'Verify firewall/antivirus settings are not blocking local connections',
        }],
      technicalDetails: match[0],
    }),
  },

  // File watcher errors
  {
    pattern: /ENOSPC|watch.*fail|EMFILE/i,
    classifier: (match) => ({
      title: 'File System Monitoring Error',
      message: 'Prism cannot monitor files for changes. This may affect real-time output capture.',
      severity: 'warning',
      suggestions: [
        {
          text: 'Increase file watcher limits (Linux/Mac)',
          action: {
            type: 'copy-command',
            payload: 'fs.inotify.max_user_watches=524288',
            label: 'Copy sysctl Command',
          },
        },
        {
          text: 'Close some file tabs or restart the IDE',
        },
      ],
      technicalDetails: match[0],
    }),
  },

  // Timeout errors
  {
    pattern: /timeout|ETIMEDOUT/i,
    classifier: (match, context) => ({
      title: 'Operation Timed Out',
      message: `The operation timed out while trying to communicate with ${context?.ideName || 'the IDE'}. The IDE might be busy or unresponsive.`,
      severity: 'warning',
      suggestions: [
        {
          text: 'Wait a moment and try again',
          action: {
            type: 'retry',
            label: 'Retry Operation',
          },
        },
        {
          text: 'Check if the IDE is frozen or processing a large task',
        },
      ],
      technicalDetails: match[0],
    }),
  },
];

/**
 * UserErrorHandler 类
 */
export class UserErrorHandler {
  private pluginManager: PluginManager;
  private ideHealthCheck: IDEHealthCheck;

  constructor(pluginManager: PluginManager, ideHealthCheck: IDEHealthCheck) {
    this.pluginManager = pluginManager;
    this.ideHealthCheck = ideHealthCheck;
  }

  /**
   * 将原始错误转换为用户友好的错误信息
   */
  async classifyError(
    error: Error | string,
    context?: {
      pluginId?: string;
      ideName?: string;
      operation?: string;
      path?: string;
    }
  ): Promise<UserFacingError> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // 尝试匹配已知模式
    for (const { pattern, classifier } of ERROR_PATTERNS) {
      const match = errorMessage.match(pattern);
      if (match) {
        return classifier(match, context);
      }
    }

    // 未匹配到已知模式，生成通用错误
    return await this.generateGenericError(error, context);
  }

  /**
   * 生成通用错误信息
   */
  private async generateGenericError(
    error: Error | string,
    context?: any
  ): Promise<UserFacingError> {
    const errorMessage = typeof error === 'string' ? error : error.message;

    return {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please check the details below or run diagnostics.',
      severity: 'error',
      suggestions: [
        {
          text: 'Run Prism Diagnostics',
          action: {
            type: 'configure',
            payload: 'diagnostic',
            label: 'Run Diagnostics',
          },
        },
        {
          text: 'Report this issue on GitHub',
          action: {
            type: 'open-url',
            payload: 'https://github.com/prism-ide/issues/new',
            label: 'Open Issue Tracker',
          },
        },
      ],
      technicalDetails: errorMessage,
    };
  }

  /**
   * 生成"无可用IDE"的提示信息
   */
  generateNoIDEPrompt(projectRoot?: string): UserFacingError {
    return {
      title: 'No IDE Detected',
      message: 'Prism could not detect any supported IDE on your system. To use Prism, you need at least one supported IDE installed.',
      severity: 'info',
      suggestions: [
        {
          text: 'View installation guides for all supported IDEs',
          action: {
            type: 'open-url',
            payload: '#plugins',
            label: 'View Installation Guides',
          },
        },
        {
          text: 'Run IDE detection diagnostic',
          action: {
            type: 'configure',
            payload: 'detect-ides',
            label: 'Detect IDEs Again',
          },
        },
        {
          text: 'Use Generic File mode (limited functionality)',
          action: {
            type: 'configure',
            payload: 'generic-file',
            label: 'Use Generic Mode',
          },
        },
      ],
    };
  }

  /**
   * 生成"IDE连接成功"的确认信息
   */
  generateConnectionSuccess(ideId: string, ideName: string): UserFacingError {
    return {
      title: 'Connected Successfully',
      message: `Prism has successfully connected to ${ideName}. You can now dispatch intents and monitor output.`,
      severity: 'info',
      suggestions: [
        {
          text: 'Start using Prism by creating an intent',
          action: {
            type: 'configure',
            payload: 'new-intent',
            label: 'Create Intent',
          },
        },
      ],
    };
  }

  /**
   * 生成完整的诊断报告摘要
   */
  async generateDiagnosticSummary(projectRoot?: string): Promise<{
    error: UserFacingError;
    report: Awaited<ReturnType<PluginManager['generateDiagnosticReport']>>;
  }> {
    const report = await this.pluginManager.generateDiagnosticReport(projectRoot);

    let severity: 'error' | 'warning' | 'info' = 'info';
    if (report.ideDetection.summary.available === 0) {
      severity = 'error';
    } else if (!report.activePlugin) {
      severity = 'warning';
    }

    const error: UserFacingError = {
      title: 'Prism Diagnostic Report',
      message: `Found ${report.ideDetection.summary.available} of ${report.ideDetection.summary.total} IDEs available.`,
      severity,
      suggestions: [
        ...(report.recommendations.map(rec => ({ text: rec }))),
        {
          text: 'Export full report for debugging',
          action: {
            type: 'copy-command',
            payload: JSON.stringify(report, null, 2),
            label: 'Copy Full Report',
          },
        },
      ],
      technicalDetails: JSON.stringify(report.ideDetection, null, 2),
    };

    return { error, report };
  }
}

// ---------------------------------------------------------------------------
// 全局错误处理工具函数
// ---------------------------------------------------------------------------

/**
 * 创建用户友好的错误处理器实例
 */
export function createErrorHandler(
  pluginManager: PluginManager,
  healthCheckInstance: IDEHealthCheck = ideHealthCheck
): UserErrorHandler {
  return new UserErrorHandler(pluginManager, healthCheckInstance);
}

/**
 * 快速包装异步函数，自动转换错误为用户友好格式
 */
export function withUserFriendlyError<T>(
  fn: () => Promise<T>,
  errorHandler: UserErrorHandler,
  context?: Parameters<typeof errorHandler['classifyError']>[1]
): Promise<T> {
  return fn().catch(async (error) => {
    const userError = await errorHandler.classifyError(error, context);
    throw userError; // 抛出用户友好的错误
  });
}
