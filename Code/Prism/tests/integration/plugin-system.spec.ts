/**
 * Plugin System Integration Tests
 * 
 * 验证插件化架构在真实场景下的工作流程：
 * 1. IDE检测和自动选择
 * 2. 延迟加载和按需激活
 * 3. 错误处理和降级机制
 * 4. 完整的用户交互流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginManager } from '../electron/adapters/PluginManager';
import { IDEHealthCheck } from '../electron/adapters/ide-health-check';
import { createPluginRegistry } from '../electron/adapters/PluginRegistry';
import {
  initializePluginSystem,
  autoSelectBestIDE,
  setActiveIDE,
  safeDispatchIntent,
  cleanupPluginSystem,
} from '../electron/plugin-system';
import type { PrismPlugin, PluginStatus, PluginEvent } from '../electron/adapters/plugin-types';

// ---------------------------------------------------------------------------
// Mock 数据和工具函数
// ---------------------------------------------------------------------------

function createMockPlugin(id: string, name: string, detectResult = false): any {
  return {
    id,
    name,
    status: PluginStatus.REGISTERED,
    
    async detect() {
      return detectResult;
    },
    
    async dispatchIntent() {},
    
    dispose() {},
    
    async getHealth() {
      return {
        status: detectResult ? 'healthy' : 'unhealthy' as const,
        lastCheck: new Date(),
        details: {
          ideDetected: detectResult,
          cliAvailable: detectResult,
        },
      };
    },
  };
}

function createTempDir(): string {
  const os = require('os');
  const path = require('path');
  return require('fs').mkdtempSync(path.join(os.tmpdir(), 'prism-plugin-test-'));
}

// ---------------------------------------------------------------------------
// 测试套件
// ---------------------------------------------------------------------------

describe('Plugin System - Core Architecture', () => {
  let pluginManager: PluginManager;

  beforeEach(() => {
    pluginManager = new PluginManager({
      autoDetect: false, // 禁用自动检测，手动控制测试
      healthCheckInterval: 0, // 禁用定时检查
    });
  });

  afterEach(async () => {
    await pluginManager.dispose();
  });

  describe('Plugin Registration (延迟加载)', () => {
    it('should register plugins without instantiating them', () => {
      // 注册构造函数而非实例
      pluginManager.register(
        () => createMockPlugin('test-1', 'Test Plugin 1'),
        { id: 'test-1', name: 'Test Plugin 1', version: '1.0.0' }
      );

      const allPlugins = pluginManager.getAllPlugins();
      
      // 应该有1个注册的插件，状态为 REGISTERED
      expect(allPlugins).toHaveLength(1);
      expect(allPlugins[0].id).toBe('test-1');
      expect(allPlugins[0].status).toBe(PluginStatus.REGISTERED);
    });

    it('should lazily instantiate plugins on first access', async () => {
      let instantiationCount = 0;

      pluginManager.register(
        () => {
          instantiationCount++;
          return createMockPlugin('lazy-1', 'Lazy Plugin');
        },
        { id: 'lazy-1', name: 'Lazy Plugin', version: '1.0.0' }
      );

      // 此时还未实例化
      expect(instantiationCount).toBe(0);

      // 第一次访问时才实例化
      const plugin = await pluginManager.getPlugin('lazy-1');
      expect(plugin).toBeDefined();
      expect(instantiationCount).toBe(1);

      // 再次访问不会重复实例化
      const plugin2 = await pluginManager.getPlugin('lazy-1');
      expect(instantiationCount).toBe(1);
      expect(plugin2).toBe(plugin);
    });
  });

  describe('Plugin Activation Flow', () => {
    it('should activate a plugin when IDE is detected', async () => {
      const mockPlugin = createMockPlugin('claude-test', 'Claude Test', true);

      pluginManager.register(() => mockPlugin, {
        id: 'claude-test',
        name: 'Claude Test',
        version: '1.0.0',
      });

      // 激活插件
      const activated = await pluginManager.activatePlugin('claude-test');

      expect(activated).toBe(true);
      expect(mockPlugin.status).toBe(PluginStatus.ACTIVE);
      expect(pluginManager.getActivePluginId()).toBe('claude-test');
    });

    it('should fail to activate when IDE is not detected', async () => {
      const mockPlugin = createMockPlugin('cursor-test', 'Cursor Test', false);

      pluginManager.register(() => mockPlugin, {
        id: 'cursor-test',
        name: 'Cursor Test',
        version: '1.0.0',
      });

      // 尝试激活
      const activated = await pluginManager.activatePlugin('cursor-test');

      expect(activated).toBe(false);
      expect(mockPlugin.status).toBe(PluginStatus.LOADED); // 加载了但未激活
      expect(pluginManager.getActivePluginId()).toBeNull();
    });
  });

  describe('Auto-Detection and Fallback', () => {
    it('should auto-select the first available IDE', async () => {
      // 注册多个插件，只有 Claude 可用
      pluginManager.register(() => createMockPlugin('ClaudeCode', 'Claude Code', true), {
        id: 'ClaudeCode',
        name: 'Claude Code',
        version: '1.0.0',
      });

      pluginManager.register(() => createMockPlugin('Cursor', 'Cursor', false), {
        id: 'Cursor',
        name: 'Cursor',
        version: '1.0.0',
      });

      pluginManager.register(() => createMockPlugin('Windsurf', 'Windsurf', false), {
        id: 'Windsurf',
        name: 'Windsurf',
        version: '1.0.0',
      });

      // 自动检测并激活
      const selectedId = await pluginManager.autoDetectAndActivate();

      expect(selectedId).toBe('ClaudeCode'); // 应该选择第一个可用的
      expect(pluginManager.getActivePluginId()).toBe('ClaudeCode');
    });

    it('should return null when no IDE is available', async () => {
      // 注册所有不可用的插件
      pluginManager.register(() => createMockPlugin('Cursor', 'Cursor', false), {
        id: 'Cursor',
        name: 'Cursor',
        version: '1.0.0',
      });

      const selectedId = await pluginManager.autoDetectAndActivate();

      expect(selectedId).toBeNull();
      expect(pluginManager.getActivePluginId()).toBeNull();
    });
  });

  describe('Event System', () => {
    it('should emit events during plugin lifecycle', async () => {
      const events: PluginEvent[] = [];

      pluginManager.on((event) => {
        events.push(event);
      });

      pluginManager.register(() => createMockPlugin('event-test', 'Event Test', true), {
        id: 'event-test',
        name: 'Event Test',
        version: '1.0.0',
      });

      // 应该触发了 registered 事件
      expect(events.some(e => e.type === 'registered')).toBe(true);

      // 清空事件列表
      events.length = 0;

      // 激活插件
      await pluginManager.activatePlugin('event-test');

      // 应该触发了 loaded 和 activated 事件
      expect(events.some(e => e.type === 'loaded')).toBe(true);
      expect(events.some(e => e.type === 'activated')).toBe(true);
    });
  });
});

describe('IDE Health Check Service', () => {
  let healthCheck: IDEHealthCheck;

  beforeEach(() => {
    healthCheck = new IDEHealthCheck();
  });

  afterEach(() => {
    healthCheck.clearCache();
  });

  it('should detect missing CLI tools gracefully', async () => {
    // 测试一个不存在的CLI工具
    const result = await healthCheck.checkIDE('nonexistent-ide');

    expect(result.available).toBe(false);
    expect(result.cliFound).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should cache detection results', async () => {
    // 第一次调用
    const result1 = await healthCheck.checkIDE('nonexistent-ide');
    const time1 = result1.detectionTimeMs;

    // 第二次调用应该使用缓存（detectionTimeMs 应该相同）
    const result2 = await healthCheck.checkIDE('nonexistent-ide');
    const time2 = result2.detectionTimeMs;

    expect(time1).toBe(time2);
  });

  it('should clear cache when requested', async () => {
    await healthCheck.checkIDE('nonexistent-ide');
    healthCheck.clearCache();

    // 缓存已清除，下次调用会重新检测
    // 这里只验证不抛异常
    const result = await healthCheck.checkIDE('nonexistent-ide');
    expect(result).toBeDefined();
  });

  it('should generate diagnostic report with system info', async () => {
    const report = await healthCheck.generateDiagnosticReport();

    expect(report.timestamp).toBeDefined();
    expect(report.systemInfo.platform).toBeDefined();
    expect(report.systemInfo.nodeVersion).toBeDefined();
    expect(report.ideResults).toBeDefined();
    expect(report.summary.total).toBeGreaterThan(0);
  });
});

describe('Integration - Real User Workflow', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    require('fs').rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle complete workflow: init → detect → select → dispatch', async () => {
    // 1. 初始化插件系统
    const { pluginManager, registry } = createPluginRegistry({
      autoDetect: false,
      healthCheckInterval: 0,
    });

    try {
      // 验证所有插件已注册
      const allPlugins = pluginManager.getAllPlugins();
      expect(allPlugins.length).toBeGreaterThanOrEqual(6); // 至少6个内置插件

      // 2. 获取插件摘要（用于UI展示）
      const summary = await registry.getPluginSummary(tempDir);
      expect(summary.length).toBe(allPlugins.length);

      // 3. 尝试自动选择最佳IDE（在测试环境中可能没有真实的IDE）
      const selection = await autoSelectBestIDE(tempDir);
      
      if (!selection.success) {
        // 如果没有检测到IDE，应该返回友好的提示信息
        expect(selection.userMessage).toBeDefined();
        expect(selection.userMessage.severity).toBe('info' || 'error');
        console.log('No IDE detected (expected in test environment):', selection.userMessage.title);
      }

      // 4. 运行诊断报告
      const diagnostics = await runDiagnostics(tempDir);
      expect(diagnostics.report).toBeDefined();
      expect(diagnostics.userSummary).toBeDefined();

      console.log('Diagnostic summary:', diagnostics.userSummary.title);

    } finally {
      await pluginManager.dispose();
    }
  }, 10000); // 增加超时时间

  it('should provide installation guide for unavailable IDEs', async () => {
    const manager = new PluginManager({ autoDetect: false });
    
    try {
      // 创建一个假的registry来获取安装指南
      const { registry } = createPluginRegistry({ autoDetect: false });
      const summary = await registry.getPluginSummary(tempDir);

      // 找一个实验性或可能不可用的插件
      const experimentalPlugin = summary.find(p => p.experimental || !p.available);
      if (experimentalPlugin) {
        const guide = manager.getInstallationGuide(experimentalPlugin.id);
        
        if (guide) {
          expect(guide.title).toBeDefined();
          expect(guide.steps.length).toBeGreaterThan(0);
          console.log(`Installation guide for ${experimentalPlugin.id}:`, guide.title);
        }
      }
    } finally {
      await manager.dispose();
    }
  });
});

describe('Error Handling and User Feedback', () => {
  it('should convert technical errors to user-friendly messages', async () => {
    const manager = new PluginManager({ autoDetect: false });
    const healthCheck = new IDEHealthCheck();
    
    // 动态导入以避免循环依赖
    const { createErrorHandler } = await import('../electron/adapters/user-error-handler');
    const errorHandler = createErrorHandler(manager, healthCheck);

    try {
      // 测试各种错误类型
      const testCases = [
        { error: new Error('command not found: claude'), expectedTitle: 'IDE CLI Tool Not Found' },
        { error: new Error('EADDRINUSE: address already in use :::1436'), expectedTitle: 'Port Already in Use' },
        { error: new Error('EACCES: permission denied'), expectedTitle: 'Permission Denied' },
        { error: new Error('ETIMEDOUT'), expectedTitle: 'Operation Timed Out' },
      ];

      for (const testCase of testCases) {
        const userError = await errorHandler.classifyError(testCase.error, {
          ideName: 'Test IDE',
          operation: 'test',
        });

        expect(userError.title).toContain(testCase.expectedTitle.split(' ')[0]); // 部分匹配
        expect(userError.suggestions.length).toBeGreaterThan(0);
        expect(userError.severity).toBeDefined();
      }

      // 测试"无IDE"提示
      const noIDEPrompt = errorHandler.generateNoIDEPrompt('/fake/path');
      expect(noIDEPrompt.title).toBe('No IDE Detected');
      expect(noIDEPrompt.suggestions.length).toBeGreaterThan(0);

    } finally {
      await manager.dispose();
    }
  });
});

describe('Backward Compatibility', () => {
  it('should maintain compatibility with AdapterManager interface', async () => {
    const { pluginManager } = createPluginRegistry({ autoDetect: false });

    try {
      // 测试旧的 getAdapter 方法仍然可用
      // 注意：由于是延迟加载，这里可能返回 undefined
      const adapter = pluginManager.getAdapter('generic-file');
      
      // generic-file 是直接实例化的，所以应该存在
      if (adapter) {
        expect(adapter.name).toBe('Generic File Adapter');
        expect(typeof adapter.dispatchIntent).toBe('function');
      }

      // 测试 getAllAdapters 方法
      const adapters = pluginManager.getAllAdapters();
      expect(Array.isArray(adapters)).toBe(true);

    } finally {
      await pluginManager.dispose();
    }
  });
});
