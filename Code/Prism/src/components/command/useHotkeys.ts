import { useEffect, useRef } from 'react';

export interface HotkeyConfig {
  /** 组合键字符串，如 'ctrl+k', 'ctrl+1', 'escape', 'ctrl+enter' */
  key: string;
  handler: () => void;
  /** 默认 true */
  enabled?: boolean;
  /** 默认 false：输入框中不触发；ESC 建议设为 true */
  allowInInput?: boolean;
}

// 判断是否 Mac（Meta 键）
function isMac(): boolean {
  return typeof navigator !== 'undefined' &&
    /mac/i.test(navigator.platform || navigator.userAgent);
}

/**
 * 解析组合键字符串，判断 KeyboardEvent 是否匹配
 * 支持格式：'ctrl+k', 'meta+k', 'escape', 'ctrl+enter', 'ctrl+1'
 * Windows 用 ctrl，Mac 用 meta（根据 isMac() 自动切换 'ctrl' 前缀）
 */
function matchesHotkey(event: KeyboardEvent, hotkeyStr: string): boolean {
  const parts = hotkeyStr.toLowerCase().split('+');
  const mainKey = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  // 将 key 名称统一：
  const eventKey = event.key.toLowerCase();

  // 检查主键匹配
  const keyMatches = eventKey === mainKey ||
    // 处理特殊键名
    (mainKey === 'escape' && eventKey === 'escape') ||
    (mainKey === 'enter' && eventKey === 'enter');

  if (!keyMatches) return false;

  // 检查修饰键
  const needsCtrl = modifiers.includes('ctrl');
  const needsMeta = modifiers.includes('meta');
  const needsAlt = modifiers.includes('alt');
  const needsShift = modifiers.includes('shift');

  // 'ctrl' 在 Mac 上映射到 Meta（Cmd）
  const ctrlOrMeta = needsCtrl
    ? (isMac() ? event.metaKey : event.ctrlKey)
    : needsMeta
      ? event.metaKey
      : false;

  if (needsCtrl || needsMeta) {
    if (!ctrlOrMeta) return false;
  } else {
    // 没有声明 ctrl/meta，但事件有 ctrl/meta 则不匹配（防止误触）
    if (event.ctrlKey || event.metaKey) return false;
  }

  if (needsAlt && !event.altKey) return false;
  if (!needsAlt && event.altKey) return false;

  if (needsShift && !event.shiftKey) return false;
  // 不检查多余 shift，因为有些字符需要 shift

  return true;
}

/** 判断当前聚焦元素是否为输入类控件 */
function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = (el as HTMLElement).tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * 全局快捷键注册 hook。
 * 在组件 mount 时注册，unmount 时清理。
 */
export function useHotkeys(hotkeys: HotkeyConfig[]): void {
  // 使用 ref 保持最新的 hotkeys 引用，避免每次重新注册
  const hotkeysRef = useRef<HotkeyConfig[]>(hotkeys);
  hotkeysRef.current = hotkeys;

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      for (const config of hotkeysRef.current) {
        const enabled = config.enabled !== false;
        if (!enabled) continue;

        if (!matchesHotkey(event, config.key)) continue;

        const allowInInput = config.allowInInput ?? false;
        if (!allowInInput && isInputFocused()) continue;

        event.preventDefault();
        config.handler();
        // 只匹配第一个，不继续检查（可根据需要调整）
        break;
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, []); // 空依赖：只注册一次，通过 ref 访问最新 hotkeys
}
