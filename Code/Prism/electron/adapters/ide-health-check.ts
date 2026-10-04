/**
 * IDE Health Check Service
 * 
 * 负责检测IDE和CLI工具的可用性
 * 提供准确的诊断信息，帮助用户理解为什么某个IDE不可用
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface IDEDetectionResult {
  /** IDE标识符 */
  ideId: string;
  /** 是否可用 */
  available: boolean;
  /** CLI工具是否找到 */
  cliFound: boolean;
  /** CLI版本（如果找到） */
  cliVersion?: string;
  /** 目录检测是否通过 */
  dirFound: boolean;
  /** 检测耗时（毫秒） */
  detectionTimeMs: number;
  /** 错误信息 */
  error?: string;
  /** 建议的修复步骤 */
  suggestions: string[];
}

/**
 * IDE检测配置注册表
 * 每个IDE的检测方法和安装指南
 */
export const IDE_REGISTRY: Record<string, {
  name: string;
  detection: {
    command: string;
    args?: string[];
    fallbackDir?: string;
    versionPattern?: RegExp;
    /**
     * Optional list of absolute executable paths to probe. The IDE is
     * considered CLI-found if ANY of these files exist on disk. Use this
     * for IDEs that ship a GUI executable but no CLI (e.g. Windsurf on
     * Windows). The paths may include env-var placeholders written as
     * ${LOCALAPPDATA}, ${PROGRAMFILES}, ${PROGRAMFILES(X86)} which are
     * resolved against process.env at probe time.
     */
    exePaths?: string[];
  };
  installationGuide: {
    title: string;
    steps: Array<{
      title: string;
      description: string;
      command?: string;
      verification?: string;
    }>;
    documentationUrl?: string;
  };
}> = {
  'ClaudeCode': {
    name: 'Claude Code (CLI/Extension)',
    detection: {
      command: 'claude',
      args: ['--version'],
      versionPattern: /claude\s+version\s+(\S+)/i,
    },
    installationGuide: {
      title: 'Install Claude Code CLI',
      steps: [
        {
          title: 'Install via npm',
          description: 'Install Claude Code globally using npm',
          command: 'npm install -g @anthropic-ai/claude-code',
          verification: 'claude --version',
        },
        {
          title: 'Authenticate',
          description: 'Run claude login to authenticate with your Anthropic account',
          command: 'claude login',
        },
      ],
      documentationUrl: 'https://docs.anthropic.com/en/docs/claude-code',
    },
  },
  'ClaudeTerminal': {
    name: 'Claude Code (Terminal Mode)',
    detection: {
      command: 'claude',
      args: ['--version'],
      versionPattern: /claude\s+version\s+(\S+)/i,
    },
    installationGuide: {
      title: 'Install Claude Code for Terminal Usage',
      steps: [
        {
          title: 'Install Claude Code',
          description: 'Same as Claude Code above - they share the same CLI',
          command: 'npm install -g @anthropic-ai/claude-code',
          verification: 'claude --version',
        },
      ],
      documentationUrl: 'https://docs.anthropic.com/en/docs/claude-code',
    },
  },
  'Cursor': {
    name: 'Cursor IDE',
    detection: {
      command: 'cursor',
      args: ['--version'],
      fallbackDir: '.cursor',
    },
    installationGuide: {
      title: 'Install Cursor IDE',
      steps: [
        {
          title: 'Download Cursor',
          description: 'Download and install Cursor from the official website',
          documentationUrl: 'https://cursor.sh',
        },
        {
          title: 'Verify Installation',
          description: 'Make sure cursor command is in your PATH',
          verification: 'cursor --version',
        },
      ],
      documentationUrl: 'https://cursor.sh',
    },
  },
  'Windsurf': {
    name: 'Windsurf IDE',
    detection: {
      command: 'windsurf',
      args: ['--version'],
      fallbackDir: '.windsurf',
      exePaths: [
        '${LOCALAPPDATA}\\Programs\\Windsurf\\Windsurf.exe',
        '${LOCALAPPDATA}\\Programs\\Windsurf\\_\\Windsurf.exe',
        '${PROGRAMFILES}\\Windsurf\\Windsurf.exe',
        '${PROGRAMFILES(X86)}\\Windsurf\\Windsurf.exe',
      ],
    },
    installationGuide: {
      title: 'Install Windsurf IDE',
      steps: [
        {
          title: 'Download Windsurf',
          description: 'Download and install Windsurf from Codeium',
          documentationUrl: 'https://codeium.com/windsurf',
        },
        {
          title: 'Verify Installation',
          description: 'Prism will auto-detect Windsurf.exe in the standard install locations. If you installed it elsewhere, set the PRISM_WINDSURF_PATH environment variable to the absolute path of Windsurf.exe.',
        },
      ],
      documentationUrl: 'https://codeium.com/windsurf',
    },
  },
  'Antigravity': {
    name: 'Antigravity IDE',
    detection: {
      command: 'agy',
      args: ['--version'],
      fallbackDir: '.antigravity',
    },
    installationGuide: {
      title: 'Install Antigravity IDE',
      steps: [
        {
          title: 'Install Antigravity',
          description: 'Install Antigravity IDE from the official source',
          documentationUrl: 'https://github.com/antigravity-ide',
        },
        {
          title: 'Verify Installation',
          description: 'Check if agy CLI is available',
          verification: 'agy --version',
        },
      ],
    },
  },
};

/**
 * IDEHealthCheck 服务类
 */
export class IDEHealthCheck {
  private cache = new Map<string, { result: IDEDetectionResult; timestamp: number }>();
  private readonly cacheTimeout = 30_000; // 30秒缓存

  /**
   * 检测单个IDE的可用性
   */
  async checkIDE(ideId: string, projectRoot?: string): Promise<IEDetectionResult> {
    const startTime = Date.now();
    
    // 检查缓存
    const cached = this.cache.get(ideId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    const config = IDE_REGISTRY[ideId];
    if (!config) {
      return {
        ideId,
        available: false,
        cliFound: false,
        dirFound: false,
        detectionTimeMs: Date.now() - startTime,
        error: `Unknown IDE: ${ideId}`,
        suggestions: [`IDE '${ideId}' is not supported`],
      };
    }

    const result: IDEDetectionResult = {
      ideId,
      available: false,
      cliFound: false,
      dirFound: false,
      detectionTimeMs: 0,
      suggestions: [],
    };

    try {
      // 0. Optional: probe known executable paths (for IDEs without a CLI,
      //    e.g. Windsurf on Windows). Any existing path marks the IDE as
      //    found, and we use the resolved path as cliVersion for the UI.
      if (config.detection.exePaths && config.detection.exePaths.length > 0) {
        for (const raw of config.detection.exePaths) {
          const resolved = raw.replace(/\$\{([A-Z0-9_()]+)\}/gi, (_, name) => {
            return process.env[name] ?? '';
          });
          if (resolved && fs.existsSync(resolved)) {
            result.cliFound = true;
            result.cliVersion = resolved;
            break;
          }
        }
      }

      // 1. 尝试CLI检测
      try {
        const { stdout } = await execAsync(
          `${config.detection.command} ${config.detection.args?.join(' ') || '--version'}`,
          { timeout: 5000 }
        );
        result.cliFound = true;
        result.cliVersion = stdout.trim();
        
        if (config.detection.versionPattern) {
          const match = stdout.match(config.detection.versionPattern);
          if (match) {
            result.cliVersion = match[1];
          }
        }
      } catch (cliError: any) {
        if (!result.cliFound) {
          result.cliFound = false;
          if (cliError.code === 'ENOENT') {
            result.suggestions.push(`CLI command '${config.detection.command}' not found in PATH`);
          } else {
            result.suggestions.push(`CLI command failed: ${cliError.message}`);
          }
        }
      }

      // 2. 尝试目录检测（如果提供了projectRoot）
      if (projectRoot && config.detection.fallbackDir) {
        const dirPath = path.join(projectRoot, config.detection.fallbackDir);
        try {
          fs.accessSync(dirPath);
          result.dirFound = true;
        } catch {
          result.dirFound = false;
          result.suggestions.push(`Directory '${config.detection.fallbackDir}' not found in project`);
        }
      }

      // 3. 判断总体可用性
      result.available = result.cliFound || result.dirFound;

      // 4. 如果不可用，添加安装建议
      if (!result.available) {
        result.suggestions.push(`To use ${config.name}, please follow the installation guide`);
      }

    } catch (error: any) {
      result.error = error.message;
      result.suggestions.push('Unexpected error during detection');
    }

    result.detectionTimeMs = Date.now() - startTime;

    // 缓存结果
    this.cache.set(ideId, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * 检测所有已注册的IDE
   */
  async checkAllIDEs(projectRoot?: string): Promise<Map<string, IDEDetectionResult>> {
    const results = new Map<string, IDEDetectionResult>();
    
    const checks = Object.keys(IDE_REGISTRY).map(async (ideId) => {
      const result = await this.checkIDE(ideId, projectRoot);
      results.set(ideId, result);
    });

    await Promise.all(checks);
    return results;
  }

  /**
   * 获取可用的IDE列表
   */
  async getAvailableIDEs(projectRoot?: string): Promise<string[]> {
    const results = await this.checkAllIDEs(projectRoot);
    const available: string[] = [];
    
    results.forEach((result, ideId) => {
      if (result.available) {
        available.push(ideId);
      }
    });

    return available;
  }

  /**
   * 获取IDE的安装指南
   */
  getInstallationGuide(ideId: string): typeof IDE_REGISTRY[string]['installationGuide'] | null {
    const config = IDE_REGISTRY[ideId];
    return config?.installationGuide || null;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 生成诊断报告（用于调试）
   */
  async generateDiagnosticReport(projectRoot?: string): Promise<{
    timestamp: string;
    systemInfo: {
      platform: string;
      arch: string;
      nodeVersion: string;
    };
    ideResults: Record<string, IDEDetectionResult>;
    summary: {
      total: number;
      available: number;
      unavailable: number;
    };
  }> {
    const results = await this.checkAllIDEs(projectRoot);
    const ideResults: Record<string, IDEDetectionResult> = {};
    
    results.forEach((value, key) => {
      ideResults[key] = value;
    });

    let available = 0;
    let unavailable = 0;
    results.forEach((result) => {
      if (result.available) available++;
      else unavailable++;
    });

    return {
      timestamp: new Date().toISOString(),
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      ideResults,
      summary: {
        total: results.size,
        available,
        unavailable,
      },
    };
  }
}

// 导出单例实例
export const ideHealthCheck = new IDEHealthCheck();
