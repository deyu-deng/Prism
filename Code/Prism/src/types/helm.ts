/**
 * Helm document status — strictly aligned with PRISM_PROJECT.md §6.3
 */
export type DocStatus =
  | 'ACTIVE'    // Recently modified (within last 10 min)
  | 'LOCKED'    // Frozen after grill convergence
  | 'PENDING'   // Has unresolved HITL decision
  | 'EMPTY'     // File exists but is empty / template not filled
  | 'STALE';    // No modification for 7+ days

export interface HelmDoc {
  title: string;
  status: DocStatus;
  content: string;
  lastModified?: Date;
}

export type HelmPhase =
  | 'init'
  | 'explore'
  | 'recon'
  | 'grill'
  | 'design'
  | 'slice'
  | 'code'
  | 'test'
  | 'debug'
  | 'deploy';

export type TaskType =
  | 'feature'
  | 'bugfix'
  | 'explore'
  | 'refactor';

export interface PrismSession {
  id: string;
  ideSessionId: string;
  workflowPhase: HelmPhase;
  taskType: TaskType;
  projectRoot: string;
  windowId: number;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface PrismQuestion {
  id: string;
  type: 'choice' | 'confirm' | 'input' | 'multi_select';
  phase?: string;
  title: string;
  options?: {
    label: string;
    detail?: string;
    input?: boolean;
    value?: any;
  }[];
}
