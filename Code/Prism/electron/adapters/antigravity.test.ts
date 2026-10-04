import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AntigravityAdapter } from './AntigravityAdapter';
import { EventEmitter } from 'events';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  constructor(shouldFail = false) {
    super();
    process.nextTick(() => {
      if (shouldFail) {
        this.emit('error', new Error('command not found'));
      } else {
        this.emit('close', 0);
      }
    });
  }
}

vi.mock('child_process', () => {
  const mSpawn = vi.fn((cmd: string, args?: string[], options?: any) => {
    const shouldFail = (cmd === 'agy' && args && args.includes('--version')) || (cmd === 'antigravity');
    return new MockChildProcess(shouldFail);
  });
  return {
    spawn: mSpawn,
    exec: vi.fn(),
  };
});

describe('AntigravityAdapter', () => {
  let adapter: AntigravityAdapter;
  let tmpDir: string;
  let origUserProfile: string | undefined;
  let origHome: string | undefined;
  let origGeminiHome: string | undefined;

  beforeEach(() => {
    adapter = new AntigravityAdapter();
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-antigravity-test-'));
    origUserProfile = process.env.USERPROFILE;
    origHome = process.env.HOME;
    origGeminiHome = process.env.GEMINI_HOME;
    process.env.USERPROFILE = tmpDir;
    process.env.HOME = tmpDir;
    delete process.env.GEMINI_HOME;
  });

  afterEach(() => {
    process.env.USERPROFILE = origUserProfile;
    process.env.HOME = origHome;
    if (origGeminiHome !== undefined) {
      process.env.GEMINI_HOME = origGeminiHome;
    } else {
      delete process.env.GEMINI_HOME;
    }
    adapter.dispose?.();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('detect() returns true when .antigravity/ directory exists', async () => {
    fs.mkdirSync(path.join(tmpDir, '.antigravity'), { recursive: true });
    const result = await adapter.detect(tmpDir);
    expect(result).toBe(true);
  });

  it('detect() returns false when no antigravity signs exist', async () => {
    const result = await adapter.detect(tmpDir);
    expect(result).toBe(false);
  });

  it('injectSystemPrompt writes .antigravity/rules.md', async () => {
    await adapter.injectSystemPrompt(tmpDir, '# Helm System Prompt\nTest content', 'override');

    const rulesPath = path.join(tmpDir, '.antigravity', 'rules.md');
    expect(fs.existsSync(rulesPath)).toBe(true);
    const content = fs.readFileSync(rulesPath, 'utf-8');
    expect(content).toContain('Helm System Prompt');
  });

  it('injectRules packages the native plugin correctly', async () => {
    await adapter.injectRules(tmpDir);

    const pluginJsonPath = path.join(tmpDir, '.antigravity', 'plugin.json');
    expect(fs.existsSync(pluginJsonPath)).toBe(true);
    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
    expect(pluginJson.name).toBe('prism-antigravity-plugin');

    const rulesPath = path.join(tmpDir, '.antigravity', 'skills', 'rules.md');
    expect(fs.existsSync(rulesPath)).toBe(true);
    const content = fs.readFileSync(rulesPath, 'utf-8');
    expect(content).toContain('Prism');
    expect(content).toContain('prism_ask_user');
  });

  it('openSession creates a session file in .antigravity/sessions/', async () => {
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Test intent' });
    expect(sessionId).toMatch(/^antigravity_/);

    const sessionDir = path.join(tmpDir, '.antigravity', 'sessions', sessionId);
    expect(fs.existsSync(sessionDir)).toBe(true);
    expect(fs.existsSync(path.join(sessionDir, 'session.json'))).toBe(true);
  });

  it('sendMessage writes input.md in session directory', async () => {
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Test' });
    await adapter.sendMessage(tmpDir, sessionId, 'Hello Antigravity');

    const inputPath = path.join(tmpDir, '.antigravity', 'sessions', sessionId, 'input.md');
    expect(fs.existsSync(inputPath)).toBe(true);
    const content = fs.readFileSync(inputPath, 'utf-8');
    expect(content).toContain('Hello Antigravity');
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
    const configPath = path.join(tmpDir, '.gemini', 'config', 'mcp_config.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.mcpServers.prism).toBeDefined();
    expect(config.mcpServers.prism.serverUrl).toBe('http://127.0.0.1:1436/sse');
  });

  it('clearMcpConfig clears the prism node from mcp_config.json', async () => {
    await adapter.injectMcpConfig();
    await adapter.clearMcpConfig();

    const configPath = path.join(tmpDir, '.gemini', 'config', 'mcp_config.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.mcpServers.prism).toBeUndefined();
  });

  it('clearMcpConfigSync clears synchronously', async () => {
    await adapter.injectMcpConfig();
    adapter.clearMcpConfigSync();

    const configPath = path.join(tmpDir, '.gemini', 'config', 'mcp_config.json');
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

  it('getLatestTranscriptPath respects GEMINI_HOME env variable', async () => {
    const customHome = path.join(tmpDir, 'custom_gemini_home');
    const brainDir = path.join(customHome, 'antigravity-ide', 'brain');
    await fs.promises.mkdir(path.join(brainDir, 'session_123', '.system_generated', 'logs'), { recursive: true });

    const transcriptPath = path.join(brainDir, 'session_123', '.system_generated', 'logs', 'transcript.jsonl');
    await fs.promises.writeFile(transcriptPath, '{"content": "hello"}', 'utf-8');

    process.env.GEMINI_HOME = customHome;
    const resolvedPath = await (adapter as any).getLatestTranscriptPath();
    expect(resolvedPath).toBe(transcriptPath);
  });

  it('watchOutput falls back to .antigravity/sessions/**/output.md when no transcript is found', async () => {
    const callbackMock = vi.fn();
    await adapter.watchOutput(tmpDir, callbackMock);

    const sessionDir = path.join(tmpDir, '.antigravity', 'sessions', 'test_session');
    await fs.promises.mkdir(sessionDir, { recursive: true });
    
    const outputPath = path.join(sessionDir, 'output.md');
    await fs.promises.writeFile(outputPath, '[[PRISM_QUESTION]]\nid: q1\ntitle: test-fallback\n[[/PRISM_QUESTION]]', 'utf-8');

    await new Promise(r => setTimeout(r, 1000));
    expect(callbackMock).toHaveBeenCalled();
  });
});


