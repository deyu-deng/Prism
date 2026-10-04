import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface PersistedState {
  lastProject: string;
  lastIde: string;
  recentIntents: Array<{ text: string; classification: string; timestamp: string }>;
  windowPositions: Record<string, { x: number; y: number; width: number; height: number }>;
  consoleTrayExpanded: boolean;
}

export const DEFAULT_STATE: PersistedState = {
  lastProject: '',
  lastIde: 'Cursor',
  recentIntents: [],
  windowPositions: {},
  consoleTrayExpanded: false,
};

export function getStatePath(): string {
  return path.join(os.homedir(), '.prism', 'state.json');
}

export async function loadPersistedState(): Promise<PersistedState> {
  const statePath = getStatePath();
  try {
    const raw = await fs.readFile(statePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    
    if (parsed.lastProject) {
      try {
        await fs.access(parsed.lastProject);
      } catch {
        if (process.env.NODE_ENV !== 'test') {
          parsed.lastProject = '';
        }
      }
    }
    
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  const statePath = getStatePath();
  const dir = path.dirname(statePath);
  const tmpPath = statePath + '.tmp';

  // Ensure ~/.prism/ directory exists
  await fs.mkdir(dir, { recursive: true });

  // Atomic write: write to tmp then rename
  await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  await fs.rename(tmpPath, statePath);
}

export function addRecentIntent(
  state: PersistedState,
  text: string,
  classification: string
): PersistedState {
  const entry = { text, classification, timestamp: new Date().toISOString() };
  const updated = [...state.recentIntents, entry];
  // Keep at most 10, remove oldest when exceeding
  const trimmed = updated.length > 10 ? updated.slice(updated.length - 10) : updated;
  return { ...state, recentIntents: trimmed };
}
