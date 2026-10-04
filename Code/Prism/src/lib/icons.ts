import {
  PlusCircle, Sparkles, Bug, AlertCircle, Search, Compass,
  ListChecks, BookOpen, Palette, BarChart3, FileCheck,
  PenTool, Code, FlaskConical, Rocket,
  CheckCircle, Loader2, Pause, XCircle, AlertTriangle, Info,
  RefreshCw, FolderOpen, Terminal, Settings, Command,
  FileText, ClipboardList, Layers, Archive,
} from 'lucide-react';

export { ListChecks } from 'lucide-react';

// ---------------------------------------------------------------------------
// Intent type icons
// ---------------------------------------------------------------------------

export const INTENT_ICONS = {
  feature: Sparkles,
  bugfix: Bug,
  explore: Compass,
  refactor: Layers,
  docs: FileText,
} as const;

// ---------------------------------------------------------------------------
// Document card icons (keyed by doc title)
// ---------------------------------------------------------------------------

export const DOC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'TASK.md': ListChecks,
  'CONTEXT.md': BookOpen,
  'DESIGN.md': Palette,
  'RESEARCH.md': BarChart3,
  'PRODUCT.md': ClipboardList,
  'HANDOFF.md': Archive,
  'DECISIONS.md': FileCheck,
} as const;

// ---------------------------------------------------------------------------
// Workflow phase icons
// ---------------------------------------------------------------------------

export const PHASE_ICONS = {
  init: Settings,
  explore: Search,
  recon: BarChart3,
  grill: AlertCircle,
  design: PenTool,
  slice: Layers,
  code: Code,
  test: FlaskConical,
  debug: Bug,
  deploy: Rocket,
} as const;

// ---------------------------------------------------------------------------
// Status icons
// ---------------------------------------------------------------------------

export const STATUS_ICONS = {
  ACTIVE: CheckCircle,
  RUNNING: Loader2,
  PENDING: Pause,
  ERROR: XCircle,
  LOCKED: Info,
  EMPTY: FileText,
  STALE: AlertTriangle,
  MINIMAL: FileText,
  FROZEN: Pause,
  HANDOFF: Archive,
  DRAFT: FileText,
  GENERATED: FileCheck,
} as const;

// ---------------------------------------------------------------------------
// Action icons
// ---------------------------------------------------------------------------

export const ACTION_ICONS = {
  refresh: RefreshCw,
  openFolder: FolderOpen,
  terminal: Terminal,
  settings: Settings,
  command: Command,
  add: PlusCircle,
} as const;

// ---------------------------------------------------------------------------
// Helper: resolve doc icon by title with fallback
// ---------------------------------------------------------------------------

export function getDocIcon(title: string): React.ComponentType<{ className?: string }> {
  return DOC_ICONS[title] ?? FileText;
}

// ---------------------------------------------------------------------------
// Helper: resolve status icon by status string
// ---------------------------------------------------------------------------

export function getStatusIcon(status: string): React.ComponentType<{ className?: string }> {
  return (STATUS_ICONS as Record<string, React.ComponentType<{ className?: string }>>)[status] ?? FileText;
}
