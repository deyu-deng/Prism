import { useState, useEffect, useCallback } from 'react';
import type {
  PermissionConfig,
  PermissionLevel,
  PermissionEvent,
  ToolCategory,
} from '../../../electron/adapters/permission-types';
import { TOOL_CATEGORIES, PERMISSION_LEVELS } from '../../../electron/adapters/permission-types';

/** 权限级别的展示配置 */
const LEVEL_OPTIONS: { value: PermissionLevel; label: string; color: string; bg: string }[] = [
  { value: 'allow', label: 'Allow', color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'ask', label: 'Ask', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 'confirm', label: 'Confirm', color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'deny', label: 'Deny', color: 'text-red-600', bg: 'bg-red-50' },
];

const RISK_BADGE: Record<string, { label: string; className: string }> = {
  low: { label: 'Low Risk', className: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High Risk', className: 'bg-red-100 text-red-700' },
};

interface PermissionPanelProps {
  config: PermissionConfig;
  onConfigChange: (updates: Partial<PermissionConfig>) => void;
  onResetDefaults: () => void;
  onExportConfig: () => string;
  onImportConfig: (json: string) => void;
  recentEvents?: PermissionEvent[];
}

export function PermissionPanel({
  config,
  onConfigChange,
  onResetDefaults,
  onExportConfig,
  onImportConfig,
  recentEvents = [],
}: PermissionPanelProps) {
  const [activeTab, setActiveTab] = useState<'tools' | 'rules' | 'activity'>('tools');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [exportedJson, setExportedJson] = useState('');

  const handleDefaultChange = useCallback(
    (level: PermissionLevel) => {
      onConfigChange({ default: level });
    },
    [onConfigChange]
  );

  const handleToolChange = useCallback(
    (category: ToolCategory | string, level: PermissionLevel) => {
      const newTools = { ...config.tools, [category]: level };
      onConfigChange({ tools: newTools });
    },
    [config.tools, onConfigChange]
  );

  const handleExport = useCallback(() => {
    const json = onExportConfig();
    setExportedJson(json);
  }, [onExportConfig]);

  const handleImport = useCallback(() => {
    if (!importText.trim()) return;
    try {
      onImportConfig(importText);
      setImportText('');
      setShowImport(false);
    } catch {
      // importConfig 会抛出异常，由调用方处理
    }
  }, [importText, onImportConfig]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-xl">{'\uD83D\uDD12'}</span>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Permission Settings</h2>
        <span className="text-xs text-[var(--text-muted)] font-mono">
          v{config.version}
        </span>
      </div>

      {/* Global Default Strategy */}
      <section className="flex flex-col gap-3 rounded-lg border border-[var(--border-default)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Global Default Behavior
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          Default policy when no specific rule matches. Recommended: Ask for safety.
        </p>
        <div className="flex flex-wrap gap-3 mt-1">
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleDefaultChange(opt.value)}
              className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                config.default === opt.value
                  ? `${opt.bg} ${opt.color} border-current`
                  : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent-blue)]'
              }`}
            >
              {config.default === opt.value && <span className="mr-1">&#x2713;</span>}
              {opt.label} {opt.value === 'ask' && '(Safe)'}
              {opt.value === 'deny' && '(Lockdown)'}
            </button>
          ))}
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        {(['tools', 'rules', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-[var(--accent-blue)] text-[var(--accent-blue)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab === 'tools' && '\uD83D\uDD27'} {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'tools' && (
        <section className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-primary)]">
                    Operation
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-primary)]">
                    Level
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-primary)]">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody>
                {TOOL_CATEGORIES.map((cat) => {
                  const currentLevel =
                    (config.tools?.[cat.key] as PermissionLevel) ?? config.default;
                  return (
                    <tr
                      key={cat.key}
                      className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-hover)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {cat.label}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{cat.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={currentLevel}
                          onChange={(e) =>
                            handleToolChange(cat.key, e.target.value as PermissionLevel)
                          }
                          className={`rounded border border-[var(--border-default)] px-2 py-1 text-xs font-medium ${
                            LEVEL_OPTIONS.find((o) => o.value === currentLevel)?.color ?? ''
                          }`}
                        >
                          {LEVEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            RISK_BADGE[cat.risk]?.className ?? ''
                          }`}
                        >
                          {RISK_BADGE[cat.risk]?.label ?? cat.risk}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'rules' && (
        <section className="flex flex-col gap-3">
          <div className="rounded-lg border border-[var(--border-default)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Path-Based Rules
            </h3>
            {config.pathRules && config.pathRules.length > 0 ? (
              <div className="space-y-2">
                {config.pathRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-md border border-[var(--border-default)] px-4 py-2"
                  >
                    <div className="flex flex-col">
                      <code className="text-xs font-mono text-[var(--text-primary)]">
                        {rule.pattern}
                      </code>
                      {rule.description && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {rule.description}
                        </span>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        rule.permission === 'deny'
                          ? 'bg-red-100 text-red-700'
                          : rule.permission === 'ask'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {rule.permission}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No path rules configured.</p>
            )}
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Path rules can be managed programmatically via the permission middleware API.
              UI-based rule editing will be available in a future version.
            </p>
          </div>
        </section>
      )}

      {activeTab === 'activity' && (
        <section className="flex flex-col gap-3">
          <div className="rounded-lg border border-[var(--border-default)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Recent Activity
            </h3>
            {recentEvents.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...recentEvents].reverse().map((event, idx) => (
                  <div
                    key={`${event.timestamp.getTime()}-${idx}`}
                    className="flex items-center justify-between rounded-md border border-[var(--border-default)] px-4 py-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[var(--text-muted)]">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {event.action}
                      </span>
                      {event.target && (
                        <span className="font-mono text-[var(--text-muted)] truncate max-w-[200px]">
                          {event.target}
                        </span>
                      )}
                    </div>
                    <span
                      className={
                        event.result === 'allowed' || event.result === 'confirmed'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {event.result === 'allowed' || event.result === 'confirmed' ? '\u2705' : '\uD83D\uDED1'}{' '}
                      {event.result}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No recent activity.</p>
            )}
          </div>
        </section>
      )}

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--border-default)]">
        <button
          onClick={onResetDefaults}
          className="px-4 py-2 rounded-md border border-[var(--border-default)] text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors"
        >
          {'\uD83D\uDD04'} Reset to Defaults
        </button>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-md border border-[var(--border-default)] text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors"
        >
          {'\uD83D\uDCE4'} Export Config
        </button>

        <button
          onClick={() => setShowImport(!showImport)}
          className="px-4 py-2 rounded-md border border-[var(--border-default)] text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors"
        >
          {'\uD83DuDCE1'} Import Config
        </button>
      </div>

      {/* Export Preview */}
      {exportedJson && (
        <div className="rounded-lg border border-[var(--border-default)] p-4">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-2">
            Exported Configuration
          </h4>
          <pre className="bg-[var(--bg-secondary)] rounded p-3 text-xs font-mono text-[var(--text-primary)] overflow-auto max-h-48">
            {exportedJson}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(exportedJson);
              setExportedJson('');
            }}
            className="mt-2 text-xs text-[var(--accent-blue)] hover:underline"
          >
            Copy to clipboard & close
          </button>
        </div>
      )}

      {/* Import Area */}
      {showImport && (
        <div className="rounded-lg border border-[var(--border-default)] p-4">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-2">
            Paste configuration JSON:
          </h4>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{"default": "ask", "tools": {...}}'
            className="w-full h-32 bg-[var(--bg-secondary)] rounded p-3 text-xs font-mono text-[var(--text-primary)] border border-[var(--border-default)] resize-none focus:outline-hidden focus:border-[var(--accent-blue)]"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="px-3 py-1.5 rounded-md bg-[var(--accent-blue)] text-white text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Import
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportText('');
              }}
              className="px-3 py-1.5 rounded-md border border-[var(--border-default)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
