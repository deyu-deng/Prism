import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Fuse from 'fuse.js';
import { Search, FileText, Zap, Terminal, Navigation } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandCategory = 'ide' | 'document' | 'action' | 'navigation';

export interface Command {
  id: string;
  label: string;
  category: CommandCategory;
  icon?: React.ComponentType<{ className?: string }>;
  /** 显示用，如 'Ctrl+O' */
  shortcut?: string;
  handler: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<CommandCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  action: { label: '操作', icon: Zap },
  document: { label: '文档', icon: FileText },
  ide: { label: 'IDE', icon: Terminal },
  navigation: { label: '导航', icon: Navigation },
};

const CATEGORY_ORDER: CommandCategory[] = ['action', 'document', 'ide', 'navigation'];

// ---------------------------------------------------------------------------
// CommandPalette component
// ---------------------------------------------------------------------------

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fuse.js 模糊搜索实例
  const fuse = useMemo(
    () =>
      new Fuse(commands, {
        keys: ['label', 'category'],
        threshold: 0.4,
        minMatchCharLength: 1,
      }),
    [commands]
  );

  // 过滤结果
  const filtered = useMemo<Command[]>(() => {
    if (!query.trim()) return commands;
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse, commands]);

  // 分组：按 category
  const grouped = useMemo(() => {
    const map = new Map<CommandCategory, Command[]>();
    for (const cat of CATEGORY_ORDER) {
      const items = filtered.filter((c) => c.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  // 扁平化列表（用于键盘导航）
  const flatList = useMemo<Command[]>(() => {
    const result: Command[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = grouped.get(cat);
      if (items) result.push(...items);
    }
    return result;
  }, [grouped]);

  // 打开时自动聚焦 & 重置状态
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // 选中项跟随过滤结果变化复位
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // 滚动到高亮项
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (cmd: Command) => {
      cmd.handler();
      onClose();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = flatList[selectedIndex];
        if (cmd) handleSelect(cmd);
        return;
      }
    },
    [flatList, selectedIndex, onClose, handleSelect]
  );

  if (!isOpen) return null;

  // 渲染命令列表（带分组标题）
  let globalIdx = 0;
  const sections: React.ReactNode[] = [];

  for (const cat of CATEGORY_ORDER) {
    const items = grouped.get(cat);
    if (!items) continue;

    const catConfig = CATEGORY_CONFIG[cat];
    const CatIcon = catConfig.icon;

    sections.push(
      <div key={cat}>
        {/* 分组标题 */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 mt-1">
          <CatIcon className="w-3 h-3 text-[var(--text-secondary)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
            {catConfig.label}
          </span>
        </div>

        {/* 命令列表 */}
        {items.map((cmd) => {
          const idx = globalIdx++;
          const isSelected = idx === selectedIndex;
          const Icon = cmd.icon;

          return (
            <button
              key={cmd.id}
              data-idx={idx}
              onClick={() => handleSelect(cmd)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                isSelected
                  ? 'bg-[var(--bg-hover)]'
                  : 'hover:bg-[var(--bg-hover)]/50'
              }`}
            >
              {/* 图标 */}
              <Tooltip content={cmd.label}>
                <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[var(--text-secondary)]">
                  {Icon ? <Icon className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-default)]" />}
                </span>
              </Tooltip>

              {/* Label */}
              <span className="flex-1 font-mono text-xs text-[var(--text-primary)] truncate">
                {cmd.label}
              </span>

              {/* 快捷键提示 */}
              {cmd.shortcut && (
                <span className="shrink-0 font-mono text-[10px] text-[var(--text-secondary)] bg-[var(--bg-base)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                  {cmd.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            data-testid="palette-overlay"
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* 面板 */}
          <div className="fixed inset-0 z-[201] flex items-start justify-center pt-[15vh] pointer-events-none">
            <motion.div
              className="pointer-events-auto w-[560px] max-h-[400px] flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {/* 搜索框 */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-base)]">
                <Search className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="搜索命令..."
                  className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                />
                <span className="shrink-0 font-mono text-[10px] text-[var(--text-secondary)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                  ESC
                </span>
              </div>

              {/* 命令列表 */}
              <div ref={listRef} className="flex-1 overflow-y-auto py-1">
                {flatList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Search className="w-5 h-5 text-[var(--border-default)]" />
                    <span className="font-mono text-xs text-[var(--text-secondary)]">无匹配命令</span>
                  </div>
                ) : (
                  sections
                )}
              </div>

              {/* 底部提示 */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border-default)] bg-[var(--bg-base)]">
                <span className="font-mono text-[10px] text-[#8B92A0]">
                  <kbd className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-1 py-0.5">↑↓</kbd>
                  {' '}导航
                </span>
                <span className="font-mono text-[10px] text-[#8B92A0]">
                  <kbd className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-1 py-0.5">↵</kbd>
                  {' '}执行
                </span>
                <span className="font-mono text-[10px] text-[var(--text-secondary)] ml-auto">
                  共 {flatList.length} 个命令
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
