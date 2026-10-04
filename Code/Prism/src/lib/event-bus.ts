// 事件类型定义 — 用于后续快捷键和命令系统
export interface PrismEvents {
  // 命令面板
  'command:open-palette': undefined;
  'command:execute': { commandId: string };

  // 快捷键
  'hotkey:triggered': { key: string; combo: string };

  // 意图
  'intent:submit': { text: string; classification: string };
  'intent:history-open': undefined;

  // 文档
  'doc:select': { title: string };
  'doc:refresh': undefined;

  // 项目
  'project:open': undefined;

  // UI
  'ui:inspector-toggle': undefined;
  'ui:console-toggle': undefined;
  'ui:focus-intent': undefined;
}

type ListenerFn = (...args: unknown[]) => void;

export class EventBus {
  private listeners: Map<string, Set<ListenerFn>> = new Map();

  on<K extends keyof PrismEvents>(
    event: K,
    listener: PrismEvents[K] extends undefined
      ? () => void
      : (payload: PrismEvents[K]) => void
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener as ListenerFn);
    return () => this.off(event, listener);
  }

  once<K extends keyof PrismEvents>(
    event: K,
    listener: PrismEvents[K] extends undefined
      ? () => void
      : (payload: PrismEvents[K]) => void
  ): () => void {
    const key = event as string;
    const wrapped: ListenerFn = (...args: unknown[]) => {
      // Remove wrapped itself before invoking to ensure single call
      this.listeners.get(key)?.delete(wrapped);
      (listener as ListenerFn)(...args);
    };
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(wrapped);
    return () => {
      this.listeners.get(key)?.delete(wrapped);
    };
  }

  off<K extends keyof PrismEvents>(
    event: K,
    listener: PrismEvents[K] extends undefined
      ? () => void
      : (payload: PrismEvents[K]) => void
  ): void {
    const key = event as string;
    this.listeners.get(key)?.delete(listener as ListenerFn);
  }

  emit<K extends keyof PrismEvents>(
    event: K,
    ...args: PrismEvents[K] extends undefined ? [] : [PrismEvents[K]]
  ): void {
    const key = event as string;
    const set = this.listeners.get(key);
    if (!set) return;
    // Snapshot to avoid mutation issues during iteration
    for (const listener of [...set]) {
      listener(...(args as unknown[]));
    }
  }
}

// 单例导出
export const prismBus = new EventBus();
