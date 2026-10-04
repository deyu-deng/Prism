import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WindsurfAdapter } from './windsurf';

vi.mock('child_process', () => {
  const execMock = vi.fn((cmd: string, optsOrCb: any, maybeCb?: any) => {
    const cb = typeof optsOrCb === 'function' ? optsOrCb : maybeCb;
    if (cb) {
      if (cmd.includes('--goto')) {
        cb(null, 'success', '');
      } else {
        cb(new Error('command not found'), '', '');
      }
    }
  });
  return { exec: execMock };
});

describe('WindsurfAdapter', () => {
  let adapter: WindsurfAdapter;
  let tmpDir: string;
  let origUserProfile: string | undefined;
  let origHome: string | undefined;

  beforeEach(() => {
    adapter = new WindsurfAdapter();
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-windsurf-test-'));
    origUserProfile = process.env.USERPROFILE;
    origHome = process.env.HOME;
    process.env.USERPROFILE = tmpDir;
    process.env.HOME = tmpDir;
  });

  afterEach(() => {
    process.env.USERPROFILE = origUserProfile;
    process.env.HOME = origHome;
    adapter.stopWatchOutput?.();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('detect() returns true when .windsurf/ directory exists', async () => {
    fs.mkdirSync(path.join(tmpDir, '.windsurf'), { recursive: true });
    const result = await adapter.detect(tmpDir);
    expect(result).toBe(true);
  });

  it('detect() returns false when no windsurf signs exist', async () => {
    const result = await adapter.detect(tmpDir);
    expect(result).toBe(false);
  });

  it('injectSystemPrompt writes .windsurfrules', async () => {
    await adapter.injectSystemPrompt(tmpDir, '# Helm System Prompt\nTest content', 'override');

    const rulesPath = path.join(tmpDir, '.windsurfrules');
    expect(fs.existsSync(rulesPath)).toBe(true);
    const content = fs.readFileSync(rulesPath, 'utf-8');
    expect(content).toContain('Helm System Prompt');
  });

  it('injectRules writes prism control rules', async () => {
    await adapter.injectRules(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, '.windsurfrules'), 'utf-8');
    expect(content).toContain('Prism');
    expect(content).toContain('prism-intent.md');
  });

  it('openSession creates a session file in .windsurf/sessions/', async () => {
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Test intent' });
    expect(sessionId).toMatch(/^windsurf_/);

    const sessionDir = path.join(tmpDir, '.windsurf', 'sessions', sessionId);
    expect(fs.existsSync(sessionDir)).toBe(true);
    expect(fs.existsSync(path.join(sessionDir, 'session.json'))).toBe(true);
  });

  it('sendMessage writes input.md in session directory', async () => {
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Test' });
    await adapter.sendMessage(tmpDir, sessionId, 'Hello Windsurf');

    const inputPath = path.join(tmpDir, '.windsurf', 'sessions', sessionId, 'input.md');
    expect(fs.existsSync(inputPath)).toBe(true);
    const content = fs.readFileSync(inputPath, 'utf-8');
    expect(content).toContain('Hello Windsurf');
  });

  it('dispatchIntent writes prism-intent.md', async () => {
    await adapter.dispatchIntent('feature', 'Build login page', tmpDir);

    const intentPath = path.join(tmpDir, '.ai', 'prism-intent.md');
    expect(fs.existsSync(intentPath)).toBe(true);
    const content = fs.readFileSync(intentPath, 'utf-8');
    expect(content).toContain('Build login page');
  });

  it('injectMcpConfig creates and updates mcp_config.json correctly', async () => {
    await adapter.injectMcpConfig();
    const configPath = path.join(tmpDir, '.codeium', 'windsurf', 'mcp_config.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.mcpServers.prism).toBeDefined();
    expect(config.mcpServers.prism.serverUrl).toBe('http://127.0.0.1:1436/sse');
  });

  it('clearMcpConfig clears the prism node from mcp_config.json', async () => {
    await adapter.injectMcpConfig();
    await adapter.clearMcpConfig();

    const configPath = path.join(tmpDir, '.codeium', 'windsurf', 'mcp_config.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.mcpServers.prism).toBeUndefined();
  });

  it('clearMcpConfigSync clears synchronously', async () => {
    await adapter.injectMcpConfig();
    adapter.clearMcpConfigSync();

    const configPath = path.join(tmpDir, '.codeium', 'windsurf', 'mcp_config.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.mcpServers.prism).toBeUndefined();
  });

  it('answerPendingQuestion resolves promise correctly', async () => {
    const qId = 'test-q';
    let resolvedVal = null;
    adapter.pendingQuestions.set(qId, (ans: any) => {
      resolvedVal = ans;
    });

    adapter.answerPendingQuestion(qId, { selected: 'option-1' });
    expect(resolvedVal).toEqual({ selected: 'option-1' });
    expect(adapter.pendingQuestions.has(qId)).toBe(false);
  });

  it('garbageCollectSessions prunes older sessions on openSession', async () => {
    // Create an old session directory first
    const oldSessionDir = path.join(tmpDir, '.windsurf', 'sessions', 'old_session');
    fs.mkdirSync(oldSessionDir, { recursive: true });
    expect(fs.existsSync(oldSessionDir)).toBe(true);

    // Open a new session
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Test' });

    // The old session directory should have been garbage collected
    expect(fs.existsSync(oldSessionDir)).toBe(false);

    // The new session directory should exist
    const newSessionDir = path.join(tmpDir, '.windsurf', 'sessions', sessionId);
    expect(fs.existsSync(newSessionDir)).toBe(true);
  });

  it('dispose clears all temporary sessions and configs', async () => {
    // Open a session which creates activeProjectRoot and session directory
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Test' });
    const sessionsDir = path.join(tmpDir, '.windsurf', 'sessions');
    expect(fs.existsSync(sessionsDir)).toBe(true);

    // Inject MCP config as well
    await adapter.injectMcpConfig();

    // Call dispose
    adapter.dispose();

    // The sessions directory should be deleted completely
    expect(fs.existsSync(sessionsDir)).toBe(false);

    // The MCP config should be cleared
    const configPath = path.join(tmpDir, '.codeium', 'windsurf', 'mcp_config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.mcpServers.prism).toBeUndefined();
  });
});
