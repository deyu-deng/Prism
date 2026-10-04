// @vitest-environment jsdom
/**
 * E2E 集成测试：命令面板 (CommandPalette) 端到端交互流程
 *
 * 覆盖场景：
 * - 打开 / 关闭面板
 * - 搜索过滤
 * - 键盘导航（ArrowDown / ArrowUp / Enter）
 * - ESC 关闭
 * - 命令执行后面板自动关闭
 * - 点击遮罩关闭
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { CommandPalette } from '../../components/command/CommandPalette';
import type { Command } from '../../components/command/CommandPalette';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCommands(overrides: Partial<Command>[] = []): Command[] {
  const defaults: Command[] = [
    { id: 'open-project', label: '打开项目...', category: 'action', shortcut: 'Ctrl+O', handler: vi.fn() },
    { id: 'refresh-docs', label: '刷新文档状态', category: 'action', shortcut: 'Ctrl+R', handler: vi.fn() },
    { id: 'doc-context', label: '打开 CONTEXT.md', category: 'document', handler: vi.fn() },
    { id: 'ide-cursor', label: '切换到 Cursor', category: 'ide', handler: vi.fn() },
    { id: 'nav-settings', label: '跳转到设置', category: 'navigation', handler: vi.fn() },
  ];
  return [
    ...defaults,
    ...overrides.map((o) => ({
      id: 'extra',
      label: '额外命令',
      category: 'action' as const,
      handler: vi.fn(),
      ...o,
    })),
  ];
}

/** 获取搜索输入框 */
function getInput() {
  return screen.getByPlaceholderText(/搜索命令/i);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CommandPalette E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // -------------------------------------------------------------------------
  // 1. 打开与关闭
  // -------------------------------------------------------------------------
  describe('打开 / 关闭', () => {
    it('isOpen=true 时面板可见，搜索框存在', () => {
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={buildCommands()} />);
      expect(getInput()).toBeTruthy();
    });

    it('isOpen=false 时面板不渲染', () => {
      render(<CommandPalette isOpen={false} onClose={vi.fn()} commands={buildCommands()} />);
      expect(screen.queryByPlaceholderText(/搜索命令/i)).toBeNull();
    });

    it('ESC 键调用 onClose 一次', () => {
      const onClose = vi.fn();
      render(<CommandPalette isOpen={true} onClose={onClose} commands={buildCommands()} />);
      fireEvent.keyDown(getInput(), { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('点击遮罩层调用 onClose', () => {
      const onClose = vi.fn();
      render(<CommandPalette isOpen={true} onClose={onClose} commands={buildCommands()} />);
      const overlay = document.querySelector('[data-testid="palette-overlay"]');
      expect(overlay).toBeTruthy();
      fireEvent.click(overlay!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('模拟 Ctrl+K 后将 isOpen 切换为 true，面板出现', () => {
      const onClose = vi.fn();
      let isOpen = false;

      const { rerender } = render(
        <CommandPalette isOpen={isOpen} onClose={onClose} commands={buildCommands()} />
      );
      expect(screen.queryByPlaceholderText(/搜索命令/i)).toBeNull();

      isOpen = true;
      rerender(<CommandPalette isOpen={isOpen} onClose={onClose} commands={buildCommands()} />);
      expect(getInput()).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 2. 搜索过滤
  // -------------------------------------------------------------------------
  describe('搜索过滤', () => {
    it('初始状态显示所有命令', () => {
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={buildCommands()} />);
      expect(screen.getByText('打开项目...')).toBeTruthy();
      expect(screen.getByText('刷新文档状态')).toBeTruthy();
      expect(screen.getByText('打开 CONTEXT.md')).toBeTruthy();
      expect(screen.getByText('切换到 Cursor')).toBeTruthy();
    });

    it('输入"刷新"后只显示匹配命令', () => {
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={buildCommands()} />);
      fireEvent.change(getInput(), { target: { value: '刷新' } });
      expect(screen.getByText('刷新文档状态')).toBeTruthy();
      expect(screen.queryByText('打开项目...')).toBeNull();
    });

    it('输入"CONTEXT"能匹配文档命令', () => {
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={buildCommands()} />);
      fireEvent.change(getInput(), { target: { value: 'CONTEXT' } });
      expect(screen.getByText('打开 CONTEXT.md')).toBeTruthy();
    });

    it('输入完全不匹配的内容时显示"无匹配命令"', () => {
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={buildCommands()} />);
      fireEvent.change(getInput(), { target: { value: 'xyzxyzxyz完全不存在' } });
      expect(screen.getByText(/无匹配命令/i)).toBeTruthy();
    });

    it('清空搜索词后重新显示所有命令', () => {
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={buildCommands()} />);
      const input = getInput();
      fireEvent.change(input, { target: { value: '刷新' } });
      expect(screen.queryByText('打开项目...')).toBeNull();

      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getByText('打开项目...')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 3. 键盘导航
  // -------------------------------------------------------------------------
  describe('键盘导航', () => {
    it('Enter 键执行第一个（默认高亮）命令', () => {
      const handler = vi.fn();
      const cmds: Command[] = [
        { id: 'cmd1', label: '命令一', category: 'action', handler },
      ];
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={cmds} />);
      fireEvent.keyDown(getInput(), { key: 'Enter' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('ArrowDown 后再 Enter 执行第二个命令', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const cmds: Command[] = [
        { id: 'cmd1', label: '命令一', category: 'action', handler: h1 },
        { id: 'cmd2', label: '命令二', category: 'action', handler: h2 },
      ];
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={cmds} />);
      const input = getInput();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledTimes(1);
    });

    it('ArrowUp 在首项时不越界', () => {
      const handler = vi.fn();
      const cmds: Command[] = [
        { id: 'cmd1', label: '命令一', category: 'action', handler },
      ];
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={cmds} />);
      const input = getInput();
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('ArrowDown 在末项时不越界', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const cmds: Command[] = [
        { id: 'cmd1', label: '命令一', category: 'action', handler: h1 },
        { id: 'cmd2', label: '命令二', category: 'action', handler: h2 },
      ];
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={cmds} />);
      const input = getInput();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(h2).toHaveBeenCalledTimes(1);
      expect(h1).not.toHaveBeenCalled();
    });

    it('ArrowDown + ArrowUp 能回到第一个命令', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const cmds: Command[] = [
        { id: 'cmd1', label: '命令一', category: 'action', handler: h1 },
        { id: 'cmd2', label: '命令二', category: 'action', handler: h2 },
      ];
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={cmds} />);
      const input = getInput();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 4. 命令执行后自动关闭
  // -------------------------------------------------------------------------
  describe('命令执行后自动关闭', () => {
    it('Enter 执行命令后调用 onClose', () => {
      const onClose = vi.fn();
      const cmds: Command[] = [
        { id: 'cmd1', label: '测试命令', category: 'action', handler: vi.fn() },
      ];
      render(<CommandPalette isOpen={true} onClose={onClose} commands={cmds} />);
      fireEvent.keyDown(getInput(), { key: 'Enter' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('点击命令项后调用 onClose', () => {
      const onClose = vi.fn();
      const handler = vi.fn();
      const cmds: Command[] = [
        { id: 'cmd1', label: '点击执行命令', category: 'action', handler },
      ];
      render(<CommandPalette isOpen={true} onClose={onClose} commands={cmds} />);
      const btn = screen.getByText('点击执行命令').closest('button');
      expect(btn).toBeTruthy();
      fireEvent.click(btn!);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('命令 handler 在 onClose 之前调用', () => {
      const callOrder: string[] = [];
      const handler = vi.fn(() => callOrder.push('handler'));
      const onClose = vi.fn(() => callOrder.push('onClose'));
      const cmds: Command[] = [
        { id: 'cmd1', label: '顺序测试', category: 'action', handler },
      ];
      render(<CommandPalette isOpen={true} onClose={onClose} commands={cmds} />);
      fireEvent.keyDown(getInput(), { key: 'Enter' });
      expect(callOrder).toEqual(['handler', 'onClose']);
    });
  });

  // -------------------------------------------------------------------------
  // 5. 快捷键提示显示
  // -------------------------------------------------------------------------
  describe('快捷键提示', () => {
    it('带 shortcut 的命令显示快捷键标签', () => {
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={buildCommands()} />);
      const items = screen.getAllByText('Ctrl+O');
      expect(items.length).toBeGreaterThan(0);
    });

    it('底部显示命令总数', () => {
      const cmds = buildCommands();
      render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={cmds} />);
      expect(screen.getByText(new RegExp(`${cmds.length} 个命令`))).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 6. 状态重置（重新打开时清空搜索词）
  // -------------------------------------------------------------------------
  describe('状态重置', () => {
    it('关闭再打开后搜索词被清空', () => {
      const { rerender } = render(
        <CommandPalette isOpen={true} onClose={vi.fn()} commands={buildCommands()} />
      );
      fireEvent.change(getInput(), { target: { value: '刷新' } });
      expect((getInput() as HTMLInputElement).value).toBe('刷新');

      rerender(<CommandPalette isOpen={false} onClose={vi.fn()} commands={buildCommands()} />);
      rerender(<CommandPalette isOpen={true} onClose={vi.fn()} commands={buildCommands()} />);
      expect((getInput() as HTMLInputElement).value).toBe('');
    });
  });
});
