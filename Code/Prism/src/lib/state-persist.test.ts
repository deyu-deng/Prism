import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// We need to test with a temp directory to avoid polluting ~/.prism
// Override getStatePath by mocking the module
import {
  DEFAULT_STATE,
  loadPersistedState,
  savePersistedState,
  addRecentIntent,
  type PersistedState,
} from './state-persist';

// Use a temporary directory for all file-system tests
let tmpDir: string;
let tmpStatePath: string;

// Spy on fs and os to redirect paths to tmpDir
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof os>();
  return {
    ...actual,
    homedir: () => tmpDir,
  };
});

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prism-test-'));
  tmpStatePath = path.join(tmpDir, '.prism', 'state.json');
});

afterEach(async () => {
  // Cleanup temp directory
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// loadPersistedState
// ---------------------------------------------------------------------------

describe('loadPersistedState', () => {
  it('returns DEFAULT_STATE when file does not exist', async () => {
    const state = await loadPersistedState();
    expect(state).toEqual(DEFAULT_STATE);
  });

  it('correctly parses existing state file', async () => {
    // Create .prism dir and write a state file
    await fs.mkdir(path.join(tmpDir, '.prism'), { recursive: true });
    const saved: PersistedState = {
      lastProject: '/home/user/my-project',
      lastIde: 'VSCode',
      recentIntents: [{ text: 'add feature', classification: 'feature', timestamp: '2026-01-01T00:00:00.000Z' }],
      windowPositions: { main: { x: 100, y: 200, width: 800, height: 600 } },
      consoleTrayExpanded: true,
    };
    await fs.writeFile(tmpStatePath, JSON.stringify(saved), 'utf-8');

    const loaded = await loadPersistedState();
    expect(loaded).toEqual(saved);
  });

  it('merges with DEFAULT_STATE for missing fields', async () => {
    await fs.mkdir(path.join(tmpDir, '.prism'), { recursive: true });
    // Partial state without consoleTrayExpanded
    const partial = { lastProject: '/some/path', lastIde: 'Cursor' };
    await fs.writeFile(tmpStatePath, JSON.stringify(partial), 'utf-8');

    const loaded = await loadPersistedState();
    expect(loaded.lastProject).toBe('/some/path');
    expect(loaded.consoleTrayExpanded).toBe(DEFAULT_STATE.consoleTrayExpanded);
  });
});

// ---------------------------------------------------------------------------
// savePersistedState
// ---------------------------------------------------------------------------

describe('savePersistedState', () => {
  it('writes state and can be read back correctly', async () => {
    const state: PersistedState = {
      ...DEFAULT_STATE,
      lastProject: '/test/project',
      lastIde: 'Windsurf',
    };

    await savePersistedState(state);
    const loaded = await loadPersistedState();
    expect(loaded).toEqual(state);
  });

  it('uses atomic write: .tmp file is not present after save completes', async () => {
    const state: PersistedState = { ...DEFAULT_STATE, lastProject: '/atomic-test' };
    await savePersistedState(state);

    // After save, the .tmp file should have been renamed away (not exist)
    const tmpPath = tmpStatePath + '.tmp';
    let tmpExists = true;
    try {
      await fs.stat(tmpPath);
    } catch {
      tmpExists = false;
    }
    expect(tmpExists).toBe(false);

    // The real state file should exist with correct content
    const raw = await fs.readFile(tmpStatePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.lastProject).toBe('/atomic-test');
  });

  it('creates ~/.prism directory if it does not exist', async () => {
    const state: PersistedState = { ...DEFAULT_STATE };
    await savePersistedState(state);

    // Check the directory was created
    const stat = await fs.stat(path.join(tmpDir, '.prism'));
    expect(stat.isDirectory()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// addRecentIntent
// ---------------------------------------------------------------------------

describe('addRecentIntent', () => {
  it('appends a new intent to the array', () => {
    const state = { ...DEFAULT_STATE };
    const updated = addRecentIntent(state, 'fix login bug', 'bugfix');
    expect(updated.recentIntents).toHaveLength(1);
    expect(updated.recentIntents[0].text).toBe('fix login bug');
    expect(updated.recentIntents[0].classification).toBe('bugfix');
    expect(updated.recentIntents[0].timestamp).toBeTruthy();
  });

  it('keeps up to 10 intents', () => {
    let state: PersistedState = { ...DEFAULT_STATE };
    for (let i = 0; i < 10; i++) {
      state = addRecentIntent(state, `intent ${i}`, 'feature');
    }
    expect(state.recentIntents).toHaveLength(10);
  });

  it('removes the oldest entry when exceeding 10', () => {
    let state: PersistedState = { ...DEFAULT_STATE };
    for (let i = 0; i < 10; i++) {
      state = addRecentIntent(state, `intent ${i}`, 'feature');
    }
    // Add 11th entry
    state = addRecentIntent(state, 'intent 10', 'feature');
    expect(state.recentIntents).toHaveLength(10);
    // oldest (intent 0) should be gone, newest (intent 10) should be last
    expect(state.recentIntents[0].text).toBe('intent 1');
    expect(state.recentIntents[9].text).toBe('intent 10');
  });

  it('does not mutate the original state', () => {
    const state: PersistedState = { ...DEFAULT_STATE };
    const updated = addRecentIntent(state, 'something', 'feature');
    expect(state.recentIntents).toHaveLength(0);
    expect(updated.recentIntents).toHaveLength(1);
  });
});
