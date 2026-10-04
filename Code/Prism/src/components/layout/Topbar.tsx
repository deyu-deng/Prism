import React, { useState, useRef, useEffect, useCallback } from "react";
import type { HelmPhase } from "../../types/helm";
import { IntentAutocomplete } from "../intent/IntentAutocomplete";
import { IntentPreview } from "../intent/IntentPreview";
import { INTENT_ICONS, PHASE_ICONS, ACTION_ICONS } from "../../lib/icons";
import { Tooltip } from "../common/Tooltip";
import { ChevronDown } from "lucide-react";

interface RecentIntent {
  text: string;
  classification: string;
  timestamp: string;
}

interface TopbarProps {
  workflowPhase: HelmPhase | null;
  intent: string;
  onIntentChange: (val: string) => void;
  onIntentSubmit: (e?: React.FormEvent) => void;
  activeIde: string;
  onIdeChange: (ide: string) => void;
  onOpenProject: () => void;
  classifiedIntent?: string;
  recentIntents?: RecentIntent[];
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const IDE_OPTIONS = ["Cursor", "VSCode", "Windsurf", "Idea", "WebStorm", "ClaudeExtension", "ClaudeTerminal", "Antigravity"];

const PHASE_SEQUENCE: HelmPhase[] = ['init', 'explore', 'recon', 'grill', 'design', 'slice', 'code', 'test', 'debug', 'deploy'];

function phaseIndex(phase: HelmPhase | null): number {
  if (!phase) return -1;
  return PHASE_SEQUENCE.indexOf(phase);
}

function phaseLabel(phase: HelmPhase | null): string {
  if (!phase) return 'IDLE';
  return phase.toUpperCase();
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

const CATEGORY_COLORS: Record<string, string> = {
  Feature: 'text-[var(--accent-teal)]',
  Bugfix: 'text-[var(--accent-rose)]',
  Explore: 'text-[var(--accent-blue)]',
  Refactor: 'text-[var(--accent-amber)]',
  Docs: 'text-[var(--text-secondary)]',
};

export function Topbar({
  workflowPhase,
  intent,
  onIntentChange,
  onIntentSubmit,
  activeIde,
  onIdeChange,
  onOpenProject,
  classifiedIntent = 'Feature',
  recentIntents = [],
  inputRef,
}: TopbarProps) {
  const [showIdeMenu, setShowIdeMenu] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowIdeMenu(false);
      }
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
        setShowHistory(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  // Ctrl+Shift+H: show intent history
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setShowHistory((prev) => !prev);
        setShowAutocomplete(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounced preview show (500ms)
  useEffect(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setShowPreview(false);
    if (intent.trim()) {
      previewTimerRef.current = setTimeout(() => setShowPreview(true), 500);
    }
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [intent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setShowHistory(false);
      setShowAutocomplete(true);
    }
  }, []);

  const handleAutocompleteSelect = useCallback((template: string) => {
    onIntentChange(template);
    setShowAutocomplete(false);
    setShowPreview(false);
    // Trigger reclassification immediately after template select
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => setShowPreview(true), 500);
  }, [onIntentChange]);

  const handleHistorySelect = useCallback((text: string) => {
    onIntentChange(text);
    setShowHistory(false);
  }, [onIntentChange]);

  const currentIdx = phaseIndex(workflowPhase);

  // Resolve intent icon
  const intentKey = classifiedIntent.toLowerCase() as keyof typeof INTENT_ICONS;
  const IntentIcon = INTENT_ICONS[intentKey] ?? INTENT_ICONS.feature;

  // Resolve phase icon
  const PhaseIcon = workflowPhase ? (PHASE_ICONS[workflowPhase] ?? PHASE_ICONS.explore) : null;

  const OpenFolderIcon = ACTION_ICONS.openFolder;

  return (
    <header className="shrink-0 h-[48px] flex items-center px-6 border-b border-[var(--border-default)] bg-[var(--bg-surface)]" style={{ position: 'relative', zIndex: 30 }}>

      {/* 1. Left Logo Area */}
      <div className="flex items-center gap-4 shrink-0">
        <h1 className="font-mono text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
          PLOBI / PRISM
        </h1>

        {/* 2. Phase Indicator */}
        <div className="flex items-center gap-2 ml-4">
          <Tooltip content={`当前阶段: ${phaseLabel(workflowPhase)}`}>
            <span className="flex items-center gap-1.5">
              {PhaseIcon && <PhaseIcon className="w-3.5 h-3.5 text-[var(--accent-blue)]" />}
              <span className="font-mono text-[10px] text-[var(--text-muted)] w-16 text-center">
                {phaseLabel(workflowPhase)}
              </span>
            </span>
          </Tooltip>
          <div className="flex items-center gap-1">
            {PHASE_SEQUENCE.map((phase, idx) => {
              const PIcon = PHASE_ICONS[phase];
              return (
                <Tooltip key={phase} content={phase.toUpperCase()}>
                  <div
                    className={`transition-colors ${
                      idx === currentIdx
                        ? 'text-[var(--accent-blue)]'
                        : idx < currentIdx
                          ? 'text-[var(--accent-blue)]/60'
                          : 'text-[var(--text-muted)]/40'
                    }`}
                  >
                    <PIcon className="w-2 h-2" />
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Sovereign Input */}
      <form
        onSubmit={onIntentSubmit}
        className="flex-1 max-w-2xl mx-8 flex items-center"
      >
        <div ref={inputWrapRef} className="relative w-full">
          <div className="relative">
            <IntentIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={intent}
              onChange={(e) => onIntentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Declare your intent... (Tab 补全, Ctrl+Shift+H 历史)"
              className="w-full h-8 bg-[var(--bg-hover)] border border-[var(--border-default)] focus:border-[var(--text-secondary)] focus:outline-hidden pl-8 pr-3 text-xs font-mono placeholder-[var(--text-muted)] rounded-md transition-colors"
            />
          </div>
          {/* Autocomplete dropdown */}
          <IntentAutocomplete
            input={intent}
            isVisible={showAutocomplete}
            onSelect={handleAutocompleteSelect}
            onClose={() => setShowAutocomplete(false)}
          />
          {/* Intent Preview */}
          <IntentPreview
            input={intent}
            classification={classifiedIntent}
            isVisible={showPreview && !showAutocomplete && !showHistory}
          />
          {/* History dropdown */}
          {showHistory && recentIntents.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xl overflow-hidden">
              {recentIntents.slice(-10).reverse().map((item, idx) => (
                <button
                  key={`${item.timestamp}-${idx}`}
                  onClick={() => handleHistorySelect(item.text)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <span className="font-mono text-xs text-[var(--text-primary)] truncate flex-1">{item.text}</span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)] ml-2 shrink-0">{formatRelativeTime(item.timestamp)}</span>
                  <span className={`font-mono text-[10px] ml-2 shrink-0 ${CATEGORY_COLORS[item.classification] ?? 'text-[var(--text-secondary)]'}`}>
                    {item.classification.toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          )}
          {showHistory && recentIntents.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xl">
              <div className="px-3 py-3 font-mono text-[10px] text-[var(--text-muted)] text-center">暂无意图历史</div>
            </div>
          )}
        </div>
      </form>

      {/* 4. Right Controls */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <Tooltip content="打开项目目录 (Ctrl+O)">
          <button
            onClick={onOpenProject}
            className="h-7 px-3 flex items-center justify-center gap-1.5 font-mono text-[10px] rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <OpenFolderIcon className="w-3.5 h-3.5" />
            打开项目...
          </button>
        </Tooltip>

        <div className="relative" ref={menuRef}>
          <Tooltip content="切换 IDE">
            <button
              onClick={() => setShowIdeMenu(!showIdeMenu)}
              className="h-7 px-3 flex items-center justify-center gap-1.5 font-mono text-[10px] rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              IDE: {activeIde}
              <ChevronDown className="w-3 h-3" />
            </button>
          </Tooltip>
          
          {showIdeMenu && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-md shadow-xl z-50 py-1">
              {IDE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => { onIdeChange(opt); setShowIdeMenu(false); }}
                  className="w-full text-left px-3 py-1.5 font-mono text-[10px] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
