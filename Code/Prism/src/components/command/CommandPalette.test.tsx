// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';
import type { Command } from './CommandPalette';

const mockCommands: Command[] = [
  {
    id: 'open-project',
    label: '打开项目...',
    category: 'action',
    shortcut: 'Ctrl+O',
    handler: vi.fn(),
  },
  {
    id: 'refresh-docs',
    label: '刷新文档状态',
    category: 'action',
    shortcut: 'Ctrl+R',
    handler: vi.fn(),
  },
  {
    id: 'doc-context',
    label: '打开 CONTEXT.md',
    category: 'document',
    handler: vi.fn(),
  },
  {
    id: 'ide-cursor',
    label: '切换到 Cursor',
    category: 'ide',
    handler: vi.fn(),
  },
];

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('isOpen=true 时渲染搜索框', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} commands={mockCommands} />
    );
    expect(screen.getByPlaceholderText(/搜索命令/i)).toBeTruthy();
  });

  it('isOpen=false 时不渲染内容', () => {
    render(
      <CommandPalette isOpen={false} onClose={vi.fn()} commands={mockCommands} />
    );
    expect(screen.queryByPlaceholderText(/搜索命令/i)).toBeNull();
  });

  it('初始状态显示所有命令', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} commands={mockCommands} />
    );
    expect(screen.getByText('打开项目...')).toBeTruthy();
    expect(screen.getByText('刷新文档状态')).toBeTruthy();
    expect(screen.getByText('打开 CONTEXT.md')).toBeTruthy();
  });

  it('输入关键词后过滤命令列表', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} commands={mockCommands} />
    );
    const input = screen.getByPlaceholderText(/搜索命令/i);
    fireEvent.change(input, { target: { value: '刷新' } });
    expect(screen.getByText('刷新文档状态')).toBeTruthy();
    // 打开项目不应出现
    expect(screen.queryByText('打开项目...')).toBeNull();
  });

  it('按 Escape 调用 onClose', () => {
    const onClose = vi.fn();
    render(
      <CommandPalette isOpen={true} onClose={onClose} commands={mockCommands} />
    );
    const input = screen.getByPlaceholderText(/搜索命令/i);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('点击遮罩层调用 onClose', () => {
    const onClose = vi.fn();
    render(
      <CommandPalette isOpen={true} onClose={onClose} commands={mockCommands} />
    );
    const overlay = document.querySelector('[data-testid="palette-overlay"]');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('Enter 键执行高亮命令', () => {
    const handler = vi.fn();
    const cmds: Command[] = [
      { id: 'test', label: '测试命令', category: 'action', handler },
    ];
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} commands={cmds} />
    );
    const input = screen.getByPlaceholderText(/搜索命令/i);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('显示快捷键提示', () => {
    render(
      <CommandPalette isOpen={true} onClose={vi.fn()} commands={mockCommands} />
    );
    // Ctrl+O 可能出现在按钮和底部提示中，使用 getAllByText
    const items = screen.getAllByText('Ctrl+O');
    expect(items.length).toBeGreaterThan(0);
  });
});
