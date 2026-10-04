import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  SkipForward,
  BookOpen,
  FlaskConical,
  Target,
} from 'lucide-react';
import { invoke } from '../../lib/ipc-client';
import { useUIStore, type PluginSummary } from '../../store/ui';
import { InstallationGuide, type InstallationGuideData } from './InstallationGuide';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IdeSelectionWizardProps {
  projectRoot: string | null;
  onSelect: (ideId: string) => Promise<{ success: boolean; error?: any }>;
  onSkip?: () => void;
  onDiagnostic?: () => void;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function getStatusIcon(available: boolean, status: PluginSummary['status']) {
  if (available && (status === 'active' || status === 'loaded')) {
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  }
  if (status === 'error') {
    return <XCircle className="w-5 h-5 text-red-600" />;
  }
  if (status === 'disabled') {
    return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  }
  return <XCircle className="w-5 h-5 text-red-400" />;
}

function getStatusLabel(plugin: PluginSummary) {
  if (plugin.available && (plugin.status === 'active' || plugin.status === 'loaded')) {
    return { text: 'Available', color: 'text-green-600 bg-green-50 border-green-200' };
  }
  if (plugin.status === 'error') {
    return { text: 'Error', color: 'text-red-600 bg-red-50 border-red-200' };
  }
  if (plugin.status === 'disabled') {
    return { text: 'Disabled', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
  }
  return { text: 'Not Installed', color: 'text-red-400 bg-red-50 border-red-200' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IdeSelectionWizard({ projectRoot, onSelect, onSkip }: IdeSelectionWizardProps) {
  const {
    plugins,
    pluginsLoading,
    selectedPluginId,
    expandedGuideId,
    diagnosticResult,
    diagnosticLoading,
    setPlugins,
    setPluginsLoading,
    selectPlugin,
    toggleGuide,
    setDiagnosticResult,
    setDiagnosticLoading,
  } = useUIStore();

  const [installGuide, setInstallGuide] = useState<InstallationGuideData | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [useGenericMode, setUseGenericMode] = useState(false);

  // Fetch plugins on mount
  useEffect(() => {
    let mounted = true;
    const fetchPlugins = async () => {
      setPluginsLoading(true);
      try {
        const result = await invoke<{ success: boolean; data: PluginSummary[] }>('get_plugin_summary');
        if (mounted && result?.data) {
          setPlugins(result.data);
        }
      } catch (err) {
        console.warn('[IdeSelectionWizard] Failed to fetch plugins:', err);
        // Set empty array so UI shows "no plugins found"
        if (mounted) setPlugins([]);
      } finally {
        if (mounted) setPluginsLoading(false);
      }
    };
    fetchPlugins();
    return () => { mounted = false; };
  }, [setPlugins, setPluginsLoading]);

  // Handle plugin selection
  const handleSelectPlugin = useCallback(
    async (plugin: PluginSummary) => {
      if (!plugin.available || selecting) return;
      setSelecting(true);
      selectPlugin(plugin.id);
      try {
        const result = await onSelect(plugin.id);
        if (!result.success) {
          console.warn('[IdeSelectionWizard] Selection failed:', result.error);
          selectPlugin(null);
        }
      } finally {
        setSelecting(false);
      }
    },
    [onSelect, selecting, selectPlugin]
  );

  // Handle diagnostics
  const handleRunDiagnostics = useCallback(async () => {
    setDiagnosticLoading(true);
    try {
      const result = await invoke<{
        success: boolean;
        report: string;
        userSummary: string;
      }>('run_diagnostics');
      if (result) {
        setDiagnosticResult({
          success: result.success,
          report: result.report,
          userSummary: result.userSummary,
        });
      }
    } catch (err) {
      console.warn('[IdeSelectionWizard] Diagnostics failed:', err);
      setDiagnosticResult({
        success: false,
        report: String(err),
        userSummary: 'Diagnostics failed to run. Please check your environment.',
      });
    } finally {
      setDiagnosticLoading(false);
    }
  }, [setDiagnosticResult, setDiagnosticLoading]);

  // Handle install guide open
  const handleOpenGuide = useCallback((plugin: PluginSummary) => {
    if (plugin.installationGuide) {
      setInstallGuide({
        title: `Install ${plugin.name}`,
        steps: plugin.installationGuide.steps.map((s) => ({
          ...s,
          verification: undefined,
        })),
        documentationUrl: undefined,
        troubleshooting: [],
      });
      toggleGuide(plugin.id);
    }
  }, [toggleGuide]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--bg-base)]/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-[var(--bg-overlay)] border border-[var(--border-default)] shadow-2xl rounded-xl p-6 flex flex-col gap-5 w-[720px] max-w-[90vw] max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-full">
            <Target className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-mono text-base font-bold text-[var(--text-primary)]">
              Welcome to Prism - IDE Setup Wizard
            </h2>
            <p className="font-mono text-[11px] text-[var(--text-secondary)] mt-0.5">
              Let&apos;s configure your development environment.
            </p>
          </div>
        </div>

        {/* Environment detection summary */}
        <div className="rounded-lg border border-[var(--border-subtle)] p-4 bg-[var(--bg-surface)]">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
            Detected Environment
          </span>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              <span className="font-mono text-[11px] text-[var(--text-secondary)]">Project Root: {projectRoot || 'Not selected'}</span>
            </div>
            <div className="flex items-center gap-2">
              {pluginsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              )}
              <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                {pluginsLoading ? 'Scanning for IDEs...' : `${plugins.length} IDE plugin(s) detected`}
              </span>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {pluginsLoading && (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="font-mono text-xs text-[var(--text-secondary)]">Loading available IDEs...</span>
          </div>
        )}

        {/* Plugin grid */}
        {!pluginsLoading && plugins.length > 0 && (
          <>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Available IDEs
            </span>
            <div className="grid grid-cols-2 gap-3">
              {plugins.map((plugin) => {
                const label = getStatusLabel(plugin);
                const isExpanded = expandedGuideId === plugin.id;
                const isSelected = selectedPluginId === plugin.id;

                return (
                  <div key={plugin.id} className="flex flex-col gap-2">
                    {/* Plugin card */}
                    <button
                      onClick={() =>
                        plugin.available && (plugin.status === 'active' || plugin.status === 'loaded')
                          ? handleSelectPlugin(plugin)
                          : handleOpenGuide(plugin)
                      }
                      disabled={selecting}
                      className={`relative flex flex-col items-start gap-2 p-4 rounded-lg border transition-all text-left ${
                        isSelected
                          ? 'border-[var(--accent-blue)] bg-blue-50/50 ring-1 ring-[var(--accent-blue)]'
                          : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-surface)]'
                      } ${!plugin.available ? 'opacity-75' : ''}`}
                    >
                      {/* Status icon + name */}
                      <div className="flex items-center gap-2 w-full">
                        {getStatusIcon(plugin.available, plugin.status)}
                        <span className="font-mono text-xs font-semibold text-[var(--text-primary)] flex-1">
                          {plugin.name}
                        </span>
                        {plugin.experimental && (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200">
                            Experimental
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                        {plugin.description}
                      </p>

                      {/* Status badge */}
                      <span
                        className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${label.color}`}
                      >
                        {label.text}
                      </span>

                      {/* Install guide link (for unavailable plugins) */}
                      {!plugin.available && plugin.installationGuide && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGuide(plugin);
                          }}
                          className="font-mono text-[10px] text-[var(--accent-blue)] hover:underline inline-flex items-center gap-1 w-fit cursor-pointer"
                          role="button"
                          tabIndex={0}
                        >
                          <BookOpen className="w-3 h-3" />
                          Install Guide
                        </span>
                      )}
                    </button>

                    {/* Expanded installation guide */}
                    {isExpanded && plugin.installationGuide && (
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 animate-in fade-in duration-200">
                        <div className="flex flex-col gap-2">
                          {plugin.installationGuide.steps.slice(0, 3).map((step, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="font-mono text-[9px] text-[var(--text-muted)] shrink-0 mt-0.5">
                                {i + 1}.
                              </span>
                              <div className="flex flex-col gap-1">
                                <span className="font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
                                  {step.title}
                                </span>
                                <p className="font-mono text-[9px] text-[var(--text-muted)]">{step.description}</p>
                                {step.command && (
                                  <code className="font-mono text-[9px] text-[var(--text-primary)] bg-[#1e1e2e] rounded px-2 py-1 inline-block">
                                    {step.command}
                                  </code>
                                )}
                              </div>
                            </div>
                          ))}
                          {plugin.installationGuide && (
                            <button
                              onClick={() => {
                                setInstallGuide({
                                  title: `Install ${plugin.name}`,
                                  steps: plugin.installationGuide!.steps,
                                });
                              }}
                              className="font-mono text-[9px] text-[var(--accent-blue)] hover:underline w-fit"
                            >
                              View full guide →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty state */}
        {!pluginsLoading && plugins.length === 0 && (
          <div className="py-8 text-center">
            <p className="font-mono text-xs text-[var(--text-muted)]">
              No IDE plugins detected. You can still use Generic File mode.
            </p>
          </div>
        )}

        {/* Diagnostic results */}
        {diagnosticResult && (
          <div className={`rounded-lg border p-4 ${diagnosticResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {diagnosticResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
                Detection Results
              </span>
            </div>
            <p className="font-mono text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {diagnosticResult.userSummary}
            </p>
            {diagnosticResult.report && (
              <details className="mt-2">
                <summary className="font-mono text-[9px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
                  Full Report
                </summary>
                <pre className="font-mono text-[9px] text-[var(--text-muted)] mt-2 whitespace-pre-wrap break-words">
                  {diagnosticResult.report}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Fallback option */}
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useGenericMode}
              onChange={(e) => setUseGenericMode(e.target.checked)}
              className="rounded border-[var(--border-default)]"
            />
            <span className="font-mono text-[11px] text-[var(--text-secondary)]">
              Use Generic File Mode (limited features)
            </span>
          </label>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={handleRunDiagnostics}
            disabled={diagnosticLoading}
            className="font-mono text-[10px] px-4 py-2 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {diagnosticLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <FlaskConical className="w-3 h-3" />
            )}
            Run Diagnostics
          </button>
          <div className="flex gap-2">
            {onSkip && (
              <button
                onClick={onSkip}
                className="font-mono text-[10px] px-4 py-2 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors inline-flex items-center gap-2"
              >
                <SkipForward className="w-3 h-3" />
                Skip for Now
              </button>
            )}
            <button
              onClick={() => {
                if (useGenericMode && onSkip) onSkip();
              }}
              disabled={!useGenericMode}
              className="font-mono text-[10px] px-4 py-2 rounded-md bg-[var(--accent-blue)] text-white hover:opacity-90 transition-colors disabled:opacity-40"
            >
              Continue with Selection
            </button>
          </div>
        </div>
      </div>

      {/* Full installation guide modal */}
      {installGuide && (
        <InstallationGuide
          guide={installGuide}
          onClose={() => setInstallGuide(null)}
        />
      )}
    </div>
  );
}
