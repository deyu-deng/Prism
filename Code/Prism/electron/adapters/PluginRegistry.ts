/**
 * Prism Plugin Registry
 * 
 * 集中管理所有IDE适配器的注册和配置
 */

import { PluginManager } from './PluginManager';
import { PluginMetadata, PluginStatus, InstallationGuide } from './plugin-types';
import { IDEAdapter } from './types';
import { GenericFileAdapter } from './GenericFileAdapter';
import { AntigravityAdapter } from './AntigravityAdapter';
import { ClaudeCodeAdapter } from './ClaudeCodeAdapter';
import { ClaudeTerminalAdapter } from './ClaudeTerminalAdapter';
import { CursorAdapter } from './cursor';
import { WindsurfAdapter } from './windsurf';
import { ideHealthCheck } from './ide-health-check';

// ---------------------------------------------------------------------------
// 插件元数据定义
// ---------------------------------------------------------------------------

const PLUGIN_REGISTRY: Array<{
  metadata: PluginMetadata;
  adapter: IDEAdapter;
  installationGuide?: InstallationGuide;
}> = [
  // 1. Generic File Adapter (始终可用，作为fallback)
  {
    metadata: {
      id: 'generic-file',
      name: 'Generic File Adapter',
      description: 'Fallback adapter that writes intents to files',
      version: '1.0.0',
      author: 'Prism Team',
    },
    adapter: new GenericFileAdapter(),
  },

  // 2. Claude Code (Extension Mode)
  {
    metadata: {
      id: 'ClaudeCode',
      name: 'Claude Code (Extension)',
      description: 'Full-featured Claude Code integration with MCP server and WebSocket bridge',
      version: '1.0.0',
      author: 'Prism Team',
      experimental: false,
    },
    adapter: new ClaudeCodeAdapter(),
  },

  // 3. Claude Code (Terminal Mode)
  {
    metadata: {
      id: 'ClaudeTerminal',
      name: 'Claude Code (Terminal)',
      description: 'Launches Claude Code CLI in terminal with real-time output monitoring',
      version: '1.0.0',
      author: 'Prism Team',
    },
    adapter: new ClaudeTerminalAdapter(),
  },

  // 4. Cursor IDE
  {
    metadata: {
      id: 'Cursor',
      name: 'Cursor IDE',
      description: 'Integration with Cursor IDE via WebSocket MCP protocol',
      version: '1.0.0',
      author: 'Prism Team',
      experimental: true,
    },
    adapter: new CursorAdapter(),
  },

  // 5. Windsurf IDE
  {
    metadata: {
      id: 'Windsurf',
      name: 'Windsurf IDE',
      description: 'Integration with Windsurf (Codeium) IDE via file-based communication',
      version: '1.0.0',
      author: 'Prism Team',
      experimental: true,
    },
    adapter: new WindsurfAdapter(),
  },

  // 6. Antigravity IDE
  {
    metadata: {
      id: 'Antigravity',
      name: 'Antigravity IDE',
      description: 'Experimental integration with Antigravity AI IDE',
      version: '1.0.0',
      author: 'Prism Team',
      experimental: true,
    },
    adapter: new AntigravityAdapter(),
  },
];

// ---------------------------------------------------------------------------
// Plugin Registry 类
// ---------------------------------------------------------------------------

export class PluginRegistry {
  private manager: PluginManager;
  private initialized = false;

  constructor(manager?: PluginManager) {
    this.manager = manager || new PluginManager({
      autoDetect: true,
      healthCheckInterval: 60_000,
    });
  }

  /**
   * 注册所有插件到 PluginManager
   */
  registerAll(): void {
    if (this.initialized) {
      console.warn('[PluginRegistry] Already initialized');
      return;
    }

    console.log(`[PluginRegistry] Registering ${PLUGIN_REGISTRY.length} plugins...`);

    PLUGIN_REGISTRY.forEach(({ metadata, adapter }) => {
      this.manager.registerAdapter(adapter, metadata);
    });

    this.initialized = true;
    console.log('[PluginRegistry] All plugins registered successfully');
  }

  /**
   * 获取 PluginManager 实例
   */
  getManager(): PluginManager {
    return this.manager;
  }

  /**
   * 获取所有可用插件的摘要信息（用于UI显示）
   */
  async getPluginSummary(projectRoot?: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    status: PluginStatus;
    available: boolean;
    experimental: boolean;
    installationGuide?: InstallationGuide;
  }>> {
    const allPlugins = this.manager.getAllPlugins();
    const summary = [];

    for (const plugin of allPlugins) {
      // 使用 ideHealthCheck 检测是否可用
      const detectionResult = await ideHealthCheck.checkIDE(plugin.id, projectRoot);
      
      summary.push({
        id: plugin.id,
        name: plugin.metadata.name,
        description: plugin.metadata.description,
        status: plugin.status,
        available: detectionResult.available,
        experimental: plugin.metadata.experimental || false,
        installationGuide: ideHealthCheck.getInstallationGuide(plugin.id),
      });
    }

    return summary;
  }
}

// ---------------------------------------------------------------------------
// 便捷函数
// ---------------------------------------------------------------------------

/**
 * 创建并初始化 PluginRegistry（应用启动时调用）
 */
export function createPluginRegistry(config?: Partial<import('./plugin-types').PluginManagerConfig>): {
  registry: PluginRegistry;
  manager: PluginManager;
} {
  const manager = new PluginManager(config);
  const registry = new PluginRegistry(manager);
  
  // 注册所有插件（不实例化）
  registry.registerAll();

  return { registry, manager };
}

/**
 * 获取全局单例（向后兼容）
 */
export function getGlobalPluginManager(): PluginManager {
  const globalAny = global as any;
  
  if (!globalAny.prismPluginManager) {
    const { manager } = createPluginRegistry();
    globalAny.prismPluginManager = manager;
  }

  return globalAny.prismPluginManager;
}

export { PLUGIN_REGISTRY };
