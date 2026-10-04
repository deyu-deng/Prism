import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PermissionMiddleware,
  createPermissionMiddleware,
} from './permission-middleware';
import type { PermissionConfig, AskUserCallback } from './permission-types';

/** 创建一个 mock 的 askUser 回调 */
function createMockAskUser(response: any): AskUserCallback {
  return vi.fn().mockResolvedValue(response);
}

describe('PermissionMiddleware', () => {
  let middleware: PermissionMiddleware;
  let mockAskUser: AskUserCallback;

  beforeEach(() => {
    mockAskUser = createMockAskUser(true);
    middleware = new PermissionMiddleware(undefined, mockAskUser);
  });

  // =========================================================================
  // 1. allow 级别直接放行
  // =========================================================================

  describe('allow level', () => {
    it('file.read 默认配置为 allow，直接放行', async () => {
      const result = await middleware.checkPermission('file.read', {
        path: '/src/index.ts',
      });

      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBeUndefined();
    });

    it('ide.control 默认配置为 allow，直接放行', async () => {
      const result = await middleware.checkPermission('ide.control');

      expect(result.allowed).toBe(true);
    });

    it('自定义 allow 配置覆盖默认策略', async () => {
      const customMW = new PermissionMiddleware(
        { default: 'deny', tools: { 'shell.execute': 'allow' } },
        mockAskUser
      );

      const result = await customMW.checkPermission('shell.execute', {
        command: 'ls',
      });

      expect(result.allowed).toBe(true);
    });
  });

  // =========================================================================
  // 2. deny 级别直接拒绝并返回原因
  // =========================================================================

  describe('deny level', () => {
    it('file.delete 默认配置为 deny，直接拒绝', async () => {
      const result = await middleware.checkPermission('file.delete', {
        path: '/src/old.ts',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied by security policy');
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion?.type).toBe('change_setting');
    });

    it('shell.execute 默认配置为 deny，直接拒绝', async () => {
      const result = await middleware.checkPermission('shell.execute', {
        command: 'rm -rf /',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied by security policy');
    });

    it('自定义 deny 覆盖工具级别', async () => {
      const customMW = new PermissionMiddleware(
        { tools: { 'file.read': 'deny' } },
        mockAskUser
      );

      const result = await customMW.checkPermission('file.read', {
        path: '/secret.txt',
      });

      expect(result.allowed).toBe(false);
    });
  });

  // =========================================================================
  // 3. ask 级别调用回调函数
  // =========================================================================

  describe('ask level', () => {
    it('file.write 默认为 ask 级别，调用用户回调', async () => {
      const result = await middleware.checkPermission('file.write', {
        path: '/src/new.ts',
      });

      expect(mockAskUser).toHaveBeenCalledTimes(1);
      // 默认 mock 返回 true → allowed
      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('用户拒绝时返回 denied 结果', async () => {
      const denyAskUser = createMockAskUser({ allowed: false });
      const askMW = new PermissionMiddleware(undefined, denyAskUser);

      const result = await askMW.checkPermission('file.write', {
        path: '/src/danger.ts',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('User denied');
    });

    it('用户返回 false 时拒绝操作', async () => {
      const falseAskUser = createMockAskUser(false);
      const askMW = new PermissionMiddleware(undefined, falseAskUser);

      const result = await askMW.checkPermission('web.fetch', {
        url: 'https://example.com',
      });

      expect(result.allowed).toBe(false);
    });

    it('ask 级别传递正确的 question 结构给回调', async () => {
      const spyAskUser = vi.fn().mockResolvedValue(true);
      // 使用 file.write（默认 ask 级别）而非 shell.execute（默认 deny）
      const spyMW = new PermissionMiddleware(
        { tools: { 'shell.execute': 'ask' } },
        spyAskUser
      );

      await spyMW.checkPermission('shell.execute', {
        command: 'npm install',
      });

      const calledQuestion = spyAskUser.mock.calls[0][0];
      expect(calledQuestion.type).toBe('permission');
      expect(calledQuestion.title).toContain('Allow shell.execute');
      expect(calledQuestion.severity).toBe('error');
      expect(calledQuestion.options).toHaveLength(4);
    });
  });

  // =========================================================================
  // 4. confirm 级别只确认不拒绝
  // =========================================================================

  describe('confirm level', () => {
    it('confirm 级别调用回调后返回 allowed', async () => {
      const confirmMW = new PermissionMiddleware(
        { default: 'confirm' },
        mockAskUser
      );

      const result = await confirmMW.checkPermission('file.write', {
        path: '/src/ok.ts',
      });

      expect(mockAskUser).toHaveBeenCalledTimes(1);
      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('confirm 级别传递 confirm 类型的问题', async () => {
      const spyAskUser = vi.fn().mockResolvedValue(undefined);
      // 显式将 mcp.call 设为 confirm（覆盖默认的 ask）
      const confirmMW = new PermissionMiddleware(
        { default: 'ask', tools: { 'mcp.call': 'confirm' } },
        spyAskUser
      );

      await confirmMW.checkPermission('mcp.call', { toolName: 'test' });

      const calledQuestion = spyAskUser.mock.calls[0][0];
      expect(calledQuestion.type).toBe('confirm');
      expect(calledQuestion.title).toContain('Confirm');
    });
  });

  // =========================================================================
  // 5. 路径规则匹配（glob 模式）
  // =========================================================================

  describe('path rules matching', () => {
    it('.env* 模式匹配 .env 文件并返回 deny', async () => {
      const result = await middleware.checkPermission('file.write', {
        path: '.env.production',
      });

      expect(result.allowed).toBe(false);
      expect(result.matchedRuleId).toBe('protect-env-files');
    });

    it('.env* 模式匹配 .env 文件本身', async () => {
      const result = await middleware.checkPermission('file.read', {
        path: '.env',
      });

      expect(result.allowed).toBe(false);
      expect(result.matchedRuleId).toBe('protect-env-files');
    });

    it('*.{json,yaml} 模式匹配 .json 文件返回 ask', async () => {
      const jsonAskUser = createMockAskUser(true);
      const askMW = new PermissionMiddleware(undefined, jsonAskUser);

      const result = await askMW.checkPermission('file.write', {
        path: 'package.json',
      });

      // 路径规则覆盖为 ask → 需要用户确认
      expect(jsonAskUser).toHaveBeenCalled();
      expect(result.matchedRuleId).toBe('protect-config-files');
    });

    it('*.{json,yaml} 模式匹配 .yaml 文件', async () => {
      const yamlAskUser = createMockAskUser(true);
      const askMW = new PermissionMiddleware(undefined, yamlAskUser);

      const result = await askMW.checkPermission('file.write', {
        path: 'config.yaml',
      });

      expect(yamlAskUser).toHaveBeenCalled();
      expect(result.matchedRuleId).toBe('protect-config-files');
    });

    it('*.{json,yaml} 模式不匹配 .ts 文件', async () => {
      const result = await middleware.checkPermission('file.write', {
        path: 'index.ts',
      });

      // index.ts 不匹配路径规则，使用 file.write 的默认 ask 级别
      expect(mockAskUser).toHaveBeenCalled();
      expect(result.matchedRuleId).toBeUndefined();
    });

    it('没有提供 path 时不进行路径规则匹配', async () => {
      const result = await middleware.checkPermission('file.write');

      // 无 path 参数，不触发路径规则，使用 file.write 的 ask 级别
      expect(mockAskUser).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. 特定工具级别覆盖
  // =========================================================================

  describe('specific tool overrides', () => {
    it('prism_ask_user 始终允许', async () => {
      const result = await middleware.checkPermission('mcp.call', {
        toolName: 'prism_ask_user',
      });

      expect(result.allowed).toBe(true);
    });

    it('prism_read_context 始终允许', async () => {
      const result = await middleware.checkPermission('file.read', {
        toolName: 'prism_read_context',
      });

      expect(result.allowed).toBe(true);
    });

    it('prism_write_decision 为 ask 级别', async () => {
      const result = await middleware.checkPermission('file.write', {
        toolName: 'prism_write_decision',
      });

      expect(mockAskUser).toHaveBeenCalled();
    });

    it('特定工具级别优先于工具类别级别', async () => {
      const customMW = new PermissionMiddleware(
        {
          tools: { 'file.write': 'deny' },
          specificTools: { prism_write_decision: 'allow' },
        },
        mockAskUser
      );

      const result = await customMW.checkPermission('file.write', {
        toolName: 'prism_write_decision',
      });

      // specificTools 优先于 tools 类别
      expect(result.allowed).toBe(true);
    });
  });

  // =========================================================================
  // 7. resolveEffectiveLevel（无用户交互的级别解析）
  // =========================================================================

  describe('resolveEffectiveLevel', () => {
    it('默认返回全局默认级别', () => {
      expect(middleware.resolveEffectiveLevel('unknown.action')).toBe('ask');
    });

    it('工具类别级别覆盖全局默认', () => {
      expect(middleware.resolveEffectiveLevel('file.delete')).toBe('deny');
    });

    it('特定工具级别最高优先级', () => {
      const level = middleware.resolveEffectiveLevel('file.read', {
        toolName: 'prism_ask_user',
      });
      expect(level).toBe('allow'); // specificTools 中 prism_ask_user 为 allow
    });

    it('路径规则最高优先级', () => {
      const level = middleware.resolveEffectiveLevel('file.read', {
        path: '.env.local',
      });
      expect(level).toBe('deny'); // 路径规则 .env* → deny
    });
  });

  // =========================================================================
  // 8. 配置管理
  // =========================================================================

  describe('config management', () => {
    it('getConfig 返回深拷贝', () => {
      const config = middleware.getConfig();
      config.default = 'deny';

      // 原始配置不应被修改
      expect(middleware.getConfig().default).toBe('ask');
    });

    it('updateConfig 更新配置并触发事件', () => {
      const listener = vi.fn();
      middleware.on('config-updated', listener);

      middleware.updateConfig({ default: 'deny' });

      expect(middleware.getConfig().default).toBe('deny');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].default).toBe('deny');
    });

    it('resetToDefaults 恢复默认配置', () => {
      middleware.updateConfig({ default: 'deny' });
      middleware.resetToDefaults();

      expect(middleware.getConfig().default).toBe('ask');
      expect(middleware.getConfig().tools['file.read']).toBe('allow');
      expect(middleware.getConfig().tools['file.delete']).toBe('deny');
    });

    it('resetToDefaults 触发 config-reset 事件', () => {
      const listener = vi.fn();
      middleware.on('config-reset', listener);

      middleware.resetToDefaults();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('exportConfig 返回有效 JSON 字符串', () => {
      const json = middleware.exportConfig();
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe(1);
      expect(parsed.default).toBe('ask');
      expect(parsed.tools).toBeDefined();
    });

    it('importConfig 从 JSON 字符串导入配置', () => {
      const exported = middleware.exportConfig();
      middleware.updateConfig({ default: 'deny' });

      middleware.importConfig(exported);

      expect(middleware.getConfig().default).toBe('ask');
    });

    it('importConfig 对无效 JSON 抛出异常', () => {
      expect(() => middleware.importConfig('not-json')).toThrow('Invalid config JSON');
    });

    it('importConfig 触发 config-imported 事件', () => {
      const listener = vi.fn();
      middleware.on('config-imported', listener);

      middleware.importConfig(middleware.exportConfig());

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('setToolPermission 更新单个工具权限', () => {
      middleware.setToolPermission('shell.execute', 'ask');

      expect(middleware.getConfig().tools['shell.execute']).toBe('ask');
    });

    it('setDefaultLevel 更新全局默认策略', () => {
      middleware.setDefaultLevel('deny');

      expect(middleware.getConfig().default).toBe('deny');
    });
  });

  // =========================================================================
  // 9. 审计日志
  // =========================================================================

  describe('audit log', () => {
    it('记录允许的操作到审计日志', async () => {
      await middleware.checkPermission('file.read', { path: '/test.ts' });

      const events = middleware.getRecentEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('file.read');
      expect(events[0].result).toBe('allowed');
      expect(events[0].target).toBe('/test.ts');
    });

    it('记录拒绝的操作到审计日志', async () => {
      await middleware.checkPermission('file.delete', { path: '/old.ts' });

      const events = middleware.getRecentEvents();
      expect(events).toHaveLength(1);
      expect(events[0].result).toBe('denied');
    });

    it('getRecentEvents 限制返回数量', async () => {
      for (let i = 0; i < 10; i++) {
        await middleware.checkPermission('file.read', { path: `/file${i}.ts` });
      }

      const events = middleware.getRecentEvents(3);
      expect(events).toHaveLength(3);
    });

    it('clearEventLog 清空日志', async () => {
      await middleware.checkPermission('file.read');
      expect(middleware.getRecentEvents()).toHaveLength(1);

      middleware.clearEventLog();
      expect(middleware.getRecentEvents()).toHaveLength(0);
    });

    it('getStats 返回正确的统计信息', async () => {
      await middleware.checkPermission('file.read', { path: 'a.ts' });   // allowed
      await middleware.checkPermission('file.read', { path: 'b.ts' });   // allowed
      await middleware.checkPermission('file.delete', { path: 'c.ts' }); // denied

      const stats = middleware.getStats();
      expect(stats.totalChecks).toBe(3);
      expect(stats.allowedCount).toBe(2);
      expect(stats.deniedCount).toBe(1);
    });

    it('权限检查触发 permission-checked 事件', async () => {
      const listener = vi.fn();
      middleware.on('permission-checked', listener);

      await middleware.checkPermission('file.read', { path: '/test.ts' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].action).toBe('file.read');
    });
  });

  // =========================================================================
  // 10. 错误降级
  // =========================================================================

  describe('error degradation', () => {
    it('askUser 回调抛出异常时降级为允许', async () => {
      const failingCallback: AskUserCallback = vi.fn().mockRejectedValue(new Error('UI not available'));
      const failMW = new PermissionMiddleware(
        { default: 'ask' },
        failingCallback
      );

      const result = await failMW.checkPermission('file.write', {
        path: '/test.ts',
      });

      // 出错时降级为允许
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('degraded to allow');
    });

    it('未知权限级别降级为允许', async () => {
      const weirdMW = new PermissionMiddleware(
        { default: 'weird-level' as any },
        mockAskUser
      );

      const result = await weirdMW.checkPermission('unknown.action');

      expect(result.allowed).toBe(true);
    });
  });

  // =========================================================================
  // 11. 工厂函数和静态方法
  // =========================================================================

  describe('factory and static methods', () => {
    it('createPermissionMiddleware 创建实例', () => {
      const instance = createPermissionMiddleware(
        { default: 'deny' },
        mockAskUser
      );

      expect(instance).toBeInstanceOf(PermissionMiddleware);
      expect(instance.getConfig().default).toBe('deny');
    });

    it('resolveMcpToolAction 映射已知工具名', () => {
      expect(PermissionMiddleware.resolveMcpToolAction('prism_write_decision')).toBe('file.write');
      expect(PermissionMiddleware.resolveMcpToolAction('prism_read_context')).toBe('file.read');
      expect(PermissionMiddleware.resolveMcpToolAction('prism_update_task')).toBe('file.write');
      expect(PermissionMiddleware.resolveMcpToolAction('prism_ask_user')).toBe('mcp.call');
    });

    it('resolveMcpToolAction 对未知工具返回 mcp.call', () => {
      expect(PermissionMiddleware.resolveMcpToolAction('unknown_tool')).toBe('mcp.call');
    });

    it('getMcpToolActionMap 返回映射副本', () => {
      const map = PermissionMiddleware.getMcpToolActionMap();
      expect(map).toHaveProperty('prism_write_decision');
      // 修改返回值不影响内部
      map.new_key = 'test';
      expect(PermissionMiddleware.getMcpToolActionMap()).not.toHaveProperty('new_key');
    });

    it('getDefaultConfig 返回默认配置的深拷贝', () => {
      const defaults = PermissionMiddleware.getDefaultConfig();
      defaults.default = 'deny';

      expect(PermissionMiddleware.getDefaultConfig().default).toBe('ask');
    });
  });

  // =========================================================================
  // 12. 日志大小限制
  // =========================================================================

  describe('log size limit', () => {
    it('超过 maxLogSize 后自动裁剪旧日志', async () => {
      // 创建一个 maxLogSize 很小的中间件来测试
      const smallMW = new PermissionMiddleware(undefined, mockAskUser);
      (smallMW as any).maxLogSize = 5;

      for (let i = 0; i < 10; i++) {
        await smallMW.checkPermission('file.read', { path: `f${i}.ts` });
      }

      const events = smallMW.getRecentEvents();
      expect(events.length).toBeLessThanOrEqual(5);
    });
  });
});
