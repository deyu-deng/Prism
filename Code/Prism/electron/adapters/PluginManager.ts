/**
 * Plugin Manager - 插件化架构核心
 * 
 * 管理所有IDE适配器插件的生命周期：
 * - 注册
 * - 延迟加载
 * - 自动检测
 * - 激活/停用
 * - 健康监控
 * - 优雅降级
 */

import {
  PrismPlugin,
  PluginMetadata,
  PluginStatus,
  PluginHealth,
  PluginEvent,
  PluginEventListener,
  PluginManagerConfig,
  InstallationGuide,
  PluginConstructor,
} from './plugin-types';
import { IDEHealthCheck, ideHealthCheck } from './ide-health-check';
import { IDEAdapter } from './types';

// 默认配置
const DEFAULT_CONFIG: PluginManagerConfig = {
  autoDetect: true,
  healthCheckInterval: 60_000, // 1分钟
  initTimeout: 10_000,        // 10秒
  enableAllOnStartup: false,
};

export class PluginManager {
  private plugins = new Map<string, PrismPlugin>();
  private metadata = new Map<string, PluginMetadata>();
  private pluginConstructors = new Map<string, PluginConstructor>();
  private listeners = new Set<PluginEventListener>();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private config: PluginManagerConfig;

  /** 当前激活的适配器ID */
  private activePluginId: string | null = null;

  constructor(config?: Partial<PluginManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 挂载到全局，保持向后兼容
    (global as any).prismPluginManager = this;
    (global as any).prismAdapterManager = this; // 兼容旧代码
  }

  // ---------------------------------------------------------------------------
  // 插件注册
  // ---------------------------------------------------------------------------

  /**
   * 注册一个插件构造函数（延迟加载）
   */
  registerConstructor(constructor: PluginConstructor, metadata: PluginMetadata): void {
    const pluginId = metadata.id;
    
    if (this.plugins.has(pluginId) || this.pluginConstructors.has(pluginId)) {
      console.warn(`[PluginManager] Plugin '${pluginId}' is already registered, overwriting`);
    }

    this.pluginConstructors.set(pluginId, constructor);
    this.metadata.set(pluginId, metadata);
    
    this.emit({
      type: 'registered',
      pluginId,
    });
    
    console.log(`[PluginManager] Plugin constructor '${pluginId}' (${metadata.name}) registered`);
  }

  /**
   * 直接注册一个插件实例
   */
  registerInstance(plugin: PrismPlugin, metadata: PluginMetadata): void {
    const pluginId = metadata.id;
    
    if (this.plugins.has(pluginId)) {
      console.warn(`[PluginManager] Plugin '${pluginId}' is already registered, overwriting`);
    }

    this.plugins.set(pluginId, plugin);
    this.metadata.set(pluginId, metadata);
    
    this.emit({
      type: 'registered',
      pluginId,
    });
    
    console.log(`[PluginManager] Plugin instance '${pluginId}' (${metadata.name}) registered`);
  }

  /**
   * @deprecated 使用 registerConstructor 或 registerInstance
   */
  register(plugin: PrismPlugin | PluginConstructor, metadata: PluginMetadata): void {
    if ('prototype' in plugin && typeof plugin === 'function') {
      this.registerConstructor(plugin as PluginConstructor, metadata);
    } else {
      this.registerInstance(plugin as PrismPlugin, metadata);
    }
  }

  /**
   * 包装现有的 IDEAdapter 为 PrismPlugin 并注册
   */
  registerAdapter(adapter: IDEAdapter, metadata: PluginMetadata): void {
    // 包装适配器为插件
    const wrappedPlugin = this.wrapAdapterAsPlugin(adapter, metadata);
    this.registerInstance(wrappedPlugin, metadata);
  }

  // ---------------------------------------------------------------------------
  // 适配器包装器
  // ---------------------------------------------------------------------------

  /**
   * 将现有的 IDEAdapter 包装为 PrismPlugin
   */
  private wrapAdapterAsPlugin(adapter: IDEAdapter, metadata: PluginMetadata): PrismPlugin {
    const self = this;
    
    const wrapped: PrismPlugin = {
      ...adapter,
      metadata,
      status: PluginStatus.LOADED,
      
      async detect(projectRoot?: string): Promise<boolean> {
        if (adapter.detect) {
          return await adapter.detect(projectRoot);
        }
        // 使用 ideHealthCheck 进行检测
        const result = await ideHealthCheck.checkIDE(adapter.id, projectRoot);
        return result.available;
      },
      
      getInstallationGuide(): InstallationGuide | null {
        return ideHealthCheck.getInstallationGuide(adapter.id);
      },
      
      dispose(): void {
        if (adapter.dispose) {
          adapter.dispose();
        }
      },
      
      // 确保所有 IDEAdapter 方法代理到原始适配器
    } as any;
    
    return wrapped;
  }

  // ---------------------------------------------------------------------------
  // 插件获取
  // ---------------------------------------------------------------------------

  /**
   * 获取插件实例（如果尚未初始化则自动初始化）
   */
  async getPlugin(id: string): Promise<PrismPlugin | undefined> {
    let plugin = this.plugins.get(id);
    
    // 如果未找到，尝试延迟初始化
    if (!plugin) {
      const constructor = this.pluginConstructors?.get(id);
      if (constructor) {
        plugin = await this.initializePlugin(id, constructor);
      }
    }
    
    return plugin;
  }

  /**
   * 获取插件实例（同步版本，返回undefined如果未初始化）
   */
  getPluginSync(id: string): PrismPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * 获取所有已注册的插件元数据
   */
  getAllPlugins(): Array<{ id: string; metadata: PluginMetadata; status: PluginStatus }> {
    const result: Array<{ id: string; metadata: PluginMetadata; status: PluginStatus }> = [];
    
    // 已实例化的插件
    this.plugins.forEach((plugin, id) => {
      result.push({
        id,
        metadata: this.metadata.get(id)!,
        status: plugin.status || PluginStatus.LOADED,
      });
    });

    // 仅注册但未实例化的插件
    this.pluginConstructors.forEach((_: any, id: string) => {
      if (!this.plugins.has(id)) {
        result.push({
          id,
          metadata: this.metadata.get(id)!,
          status: PluginStatus.REGISTERED,
        });
      }
    });

    return result;
  }

  /**
   * 获取所有可用的（已激活的）插件
   */
  async getAvailablePlugins(projectRoot?: string): Promise<PrismPlugin[]> {
    const available: PrismPlugin[] = [];
    
    for (const [id, plugin] of this.plugins) {
      if (plugin.status === PluginStatus.ACTIVE) {
        available.push(plugin);
        continue;
      }

      // 尝试检测并激活
      if (plugin.detect) {
        try {
          const detected = await plugin.detect(projectRoot);
          if (detected) {
            await this.activatePlugin(id, projectRoot);
            available.push(this.plugins.get(id)!);
          }
        } catch (error) {
          console.error(`[PluginManager] Failed to detect plugin ${id}:`, error);
        }
      }
    }

    return available;
  }

  // ---------------------------------------------------------------------------
  // 兼容性方法（保持与 AdapterManager 的兼容）
  // ---------------------------------------------------------------------------

  /**
   * @deprecated 使用 getPlugin() 替代
   * 保持与 AdapterManager 的向后兼容
   */
  getAdapter(id: string): IDEAdapter | undefined {
    const plugin = this.plugins.get(id);
    return plugin as unknown as IDEAdapter | undefined;
  }

  /**
   * @deprecated 使用 getAllPlugins() 替代
   */
  getAllAdapters(): IDEAdapter[] {
    const adapters: IDEAdapter[] = [];
    this.plugins.forEach((plugin) => {
      adapters.push(plugin as unknown as IDEAdapter);
    });
    return adapters;
  }

  // ---------------------------------------------------------------------------
  // 插件生命周期管理
  // ---------------------------------------------------------------------------

  /**
   * 初始化单个插件
   */
  private async initializePlugin(
    id: string,
    constructor: new () => PrismPlugin
  ): Promise<PrismPlugin | undefined> {
    try {
      this.emit({ type: 'loaded', pluginId: id });
      
      // 创建实例（这可能会启动服务器等重量级操作）
      const instance = new constructor();
      instance.status = PluginStatus.LOADED;
      
      this.plugins.set(id, instance);
      
      console.log(`[PluginManager] Plugin '${id}' initialized successfully`);
      return instance;
    } catch (error: any) {
      console.error(`[PluginManager] Failed to initialize plugin '${id}':`, error);
      this.emit({ type: 'error', pluginId: id, error });
      return undefined;
    }
  }

  /**
   * 激活插件（检测IDE可用性 + 初始化资源）
   */
  async activatePlugin(id: string, projectRoot?: string): Promise<boolean> {
    const plugin = await this.getPlugin(id);
    if (!plugin) {
      console.error(`[PluginManager] Cannot activate plugin '${id}': not found`);
      return false;
    }

    try {
      // 更新状态为加载中
      plugin.status = PluginStatus.LOADING;

      // 1. 检测IDE是否可用
      let ideDetected = false;
      if (plugin.detect) {
        ideDetected = await plugin.detect(projectRoot);
        
        if (!ideDetected) {
          plugin.status = PluginStatus.LOADED; // 加载了但不可用
          console.warn(`[PluginManager] Plugin '${id}': IDE not detected`);
          return false;
        }
      }

      // 2. 执行自定义初始化
      if (plugin.initialize) {
        await Promise.race([
          plugin.initialize(projectRoot),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Initialization timeout')), this.config.initTimeout)
          ),
        ]);
      }

      // 3. 标记为活跃
      plugin.status = PluginStatus.ACTIVE;
      this.activePluginId = id;
      
      this.emit({ type: 'activated', pluginId: id });
      console.log(`[PluginManager] Plugin '${id}' activated successfully`);
      
      return true;
    } catch (error: any) {
      plugin.status = PluginStatus.ERROR;
      this.emit({ type: 'error', pluginId: id, error });
      console.error(`[PluginManager] Failed to activate plugin '${id}':`, error);
      return false;
    }
  }

  /**
   * 停用插件
   */
  async deactivatePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    try {
      // 停止输出监控
      if (plugin.stopWatchOutput) {
        plugin.stopWatchOutput();
      }

      // 更新状态
      plugin.status = PluginStatus.LOADED;
      
      if (this.activePluginId === id) {
        this.activePluginId = null;
      }

      this.emit({ type: 'deactivated', pluginId: id });
      console.log(`[PluginManager] Plugin '${id}' deactivated`);
    } catch (error: any) {
      console.error(`[PluginManager] Error deactivating plugin '${id}':`, error);
    }
  }

  /**
   * 设置当前活动的插件
   */
  async setActivePlugin(id: string, projectRoot?: string): Promise<boolean> {
    // 先停用当前活动插件
    if (this.activePluginId && this.activePluginId !== id) {
      await this.deactivatePlugin(this.activePluginId);
    }

    // 激活新插件
    return await this.activatePlugin(id, projectRoot);
  }

  /**
   * 获取当前活动插件
   */
  getActivePlugin(): PrismPlugin | null {
    if (!this.activePluginId) return null;
    return this.plugins.get(this.activePluginId) || null;
  }

  /**
   * 获取当前活动插件ID
   */
  getActivePluginId(): string | null {
    return this.activePluginId;
  }

  // ---------------------------------------------------------------------------
  // 自动检测和激活
  // ---------------------------------------------------------------------------

  /**
   * 自动检测所有已注册的IDE，并激活第一个可用的
   */
  async autoDetectAndActivate(projectRoot?: string): Promise<string | null> {
    if (!this.config.autoDetect) {
      console.log('[PluginManager] Auto-detection disabled');
      return null;
    }

    console.log('[PluginManager] Starting auto-detection of IDEs...');
    
    // 使用 IDEHealthCheck 进行快速检测
    const detectionResults = await ideHealthCheck.checkAllIDEs(projectRoot);
    
    // 按优先级排序：ClaudeCode > ClaudeTerminal > Cursor > Windsurf > Antigravity
    const priorityOrder = ['ClaudeCode', 'ClaudeTerminal', 'Cursor', 'Windsurf', 'Antigravity'];
    
    for (const ideId of priorityOrder) {
      const result = detectionResults.get(ideId);
      if (result?.available) {
        console.log(`[PluginManager] Found available IDE: ${ideId}`);
        const activated = await this.activatePlugin(ideId, projectRoot);
        if (activated) {
          return ideId;
        }
      }
    }

    console.warn('[PluginManager] No IDE detected. User will need to manually select or install an IDE.');
    return null;
  }

  // ---------------------------------------------------------------------------
  // 健康检查
  // ---------------------------------------------------------------------------

  /**
   * 开始定期健康检查
   */
  startHealthCheck(interval?: number): void {
    this.stopHealthCheck();
    
    const checkInterval = interval || this.config.healthCheckInterval;
    if (checkInterval <= 0) return;

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, checkInterval);

    console.log(`[PluginManager] Health check started (interval: ${checkInterval}ms)`);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * 执行一次健康检查
   */
  async performHealthCheck(): Promise<Map<string, PluginHealth>> {
    const results = new Map<string, PluginHealth>();

    for (const [id, plugin] of this.plugins) {
      try {
        if (plugin.getHealth) {
          const health = await plugin.getHealth();
          results.set(id, health);
          
          this.emit({
            type: 'health-changed',
            pluginId: id,
            health,
          });
        }
      } catch (error: any) {
        results.set(id, {
          status: 'unhealthy',
          lastCheck: new Date(),
          details: {
            ideDetected: false,
            cliAvailable: false,
          },
          error: error.message,
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // 安装指南和诊断
  // ---------------------------------------------------------------------------

  /**
   * 获取插件的安装指南
   */
  getInstallationGuide(pluginId: string): InstallationGuide | null {
    const plugin = this.plugins.get(pluginId);
    if (plugin?.getInstallationGuide) {
      return plugin.getInstallationGuide();
    }
    
    // 回退到 IDEHealthCheck 的通用指南
    return ideHealthCheck.getInstallationGuide(pluginId);
  }

  /**
   * 生成完整的诊断报告
   */
  async generateDiagnosticReport(projectRoot?: string): Promise<{
    timestamp: string;
    activePlugin: string | null;
    registeredPlugins: Array<{ id: string; name: string; status: PluginStatus }>;
    ideDetection: Awaited<ReturnType<typeof ideHealthCheck.generateDiagnosticReport>>;
    recommendations: string[];
  }> {
    const ideReport = await ideHealthCheck.generateDiagnosticReport(projectRoot);
    const recommendations: string[] = [];

    // 生成建议
    if (ideReport.summary.available === 0) {
      recommendations.push('No IDE detected. Install at least one supported IDE to use Prism.');
      recommendations.push('Run `npx prism doctor` for detailed installation instructions.');
    }

    if (!this.activePluginId && ideReport.summary.available > 0) {
      const available = Array.from(ideReport.ideResults.entries())
        .filter(([_, r]) => r.available)
        .map(([id]) => id);
      recommendations.push(`Available IDEs: ${available.join(', ')}. Use setActivePlugin() to activate one.`);
    }

    return {
      timestamp: new Date().toISOString(),
      activePlugin: this.activePluginId,
      registeredPlugins: this.getAllPlugins().map(({ id, metadata, status }) => ({
        id,
        name: metadata.name,
        status,
      })),
      ideDetection: ideReport,
      recommendations,
    };
  }

  // ---------------------------------------------------------------------------
  // 事件系统
  // ---------------------------------------------------------------------------

  /**
   * 监听插件事件
   */
  on(listener: PluginEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: PluginEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[PluginManager] Event listener error:', error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 资源清理
  // ---------------------------------------------------------------------------

  /**
   * 清理所有插件资源
   */
  async dispose(): Promise<void> {
    console.log('[PluginManager] Disposing all plugins...');
    
    // 停止健康检查
    this.stopHealthCheck();

    // 清理所有插件
    const disposePromises = Array.from(this.plugins.entries()).map(async ([id, plugin]) => {
      try {
        if (plugin.dispose) {
          plugin.dispose();
        }
        console.log(`[PluginManager] Plugin '${id}' disposed`);
      } catch (error: any) {
        console.error(`[PluginManager] Error disposing plugin '${id}':`, error);
      }
    });

    await Promise.all(disposePromises);

    // 清空状态
    this.plugins.clear();
    this.metadata.clear();
    this.listeners.clear();
    this.activePluginId = null;

    console.log('[PluginManager] All plugins disposed');
  }
}

// 导出单例工厂函数
export function createPluginManager(config?: Partial<PluginManagerConfig>): PluginManager {
  return new PluginManager(config);
}
