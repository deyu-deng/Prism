import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CursorAdapter } from './cursor';
import { WebSocket } from 'ws';
import { exec } from 'child_process';

vi.mock('child_process', () => ({
  exec: vi.fn((cmd: string, optsOrCb: any, maybeCb?: any) => {
    const cb = typeof optsOrCb === 'function' ? optsOrCb : maybeCb;
    // Default: command not found
    if (cb) cb(new Error('command not found'), '', '');
  }),
}));

describe('CursorAdapter', () => {
  let adapter: CursorAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new CursorAdapter();
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-cursor-test-'));
  });

  afterEach(() => {
    adapter.stopWatchOutput?.();
    if (typeof (adapter as any).dispose === 'function') {
      (adapter as any).dispose();
    }
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('detect() returns true when .cursor/ directory exists', async () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor'), { recursive: true });
    const result = await adapter.detect(tmpDir);
    expect(result).toBe(true);
  });

  it('detect() returns false when no cursor signs exist', async () => {
    const result = await adapter.detect(tmpDir);
    expect(result).toBe(false);
  });

  it('injectSystemPrompt writes .cursorrules and .cursor/rules', async () => {
    await adapter.injectSystemPrompt(tmpDir, '# Helm System Prompt\nTest content', 'override');

    const cursorRules = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');
    expect(cursorRules).toContain('Helm System Prompt');

    const cursorRulesDir = path.join(tmpDir, '.cursor', 'rules');
    expect(fs.existsSync(cursorRulesDir)).toBe(true);
    const rulesContent = fs.readFileSync(cursorRulesDir, 'utf-8');
    expect(rulesContent).toContain('Helm System Prompt');
  });

  it('injectRules writes prism control rules', async () => {
    await adapter.injectRules(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');
    expect(content).toContain('Prism');
    expect(content).toContain('prism-intent.md');
  });

  it('openSession creates a session file in .cursor/chat/', async () => {
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Test intent' });
    expect(sessionId).toMatch(/^cursor_/);

    const sessionDir = path.join(tmpDir, '.cursor', 'chat', sessionId);
    expect(fs.existsSync(sessionDir)).toBe(true);
    expect(fs.existsSync(path.join(sessionDir, 'session.json'))).toBe(true);
  });

  it('sendMessage writes input.md in session directory', async () => {
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Test' });
    await adapter.sendMessage(tmpDir, sessionId, 'Hello Cursor');

    const inputPath = path.join(tmpDir, '.cursor', 'chat', sessionId, 'input.md');
    expect(fs.existsSync(inputPath)).toBe(true);
    const content = fs.readFileSync(inputPath, 'utf-8');
    expect(content).toContain('Hello Cursor');
  });

  it('dispatchIntent writes prism-intent.md', async () => {
    await adapter.dispatchIntent('feature', 'Build login page', tmpDir);

    const intentPath = path.join(tmpDir, '.ai', 'prism-intent.md');
    expect(fs.existsSync(intentPath)).toBe(true);
    const content = fs.readFileSync(intentPath, 'utf-8');
    expect(content).toContain('Build login page');
  });

  it('WebSocket channel handles init and tool calls correctly', async () => {
    // Open a new session
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Test' });

    // Establish WebSocket client connection
    const client = new WebSocket('ws://localhost:1439');
    
    await new Promise<void>((resolve, reject) => {
      client.on('open', () => resolve());
      client.on('error', (err) => reject(err));
    });

    // 1. Test 'init' command
    client.send(JSON.stringify({
      type: 'init',
      sessionId,
      projectRoot: tmpDir
    }));

    // Give a short moment for message processing
    await new Promise(r => setTimeout(r, 100));

    // 2. Test 'prism_ask_user' tool call
    const askUserPromise = new Promise<any>((resolve) => {
      client.on('message', (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.type === 'tool_response' && data.messageId === 'msg-ask-user') {
            resolve(data.result);
          }
        } catch {}
      });
    });

    const questionMock = vi.fn();
    adapter.watchOutput(tmpDir, questionMock);

    client.send(JSON.stringify({
      type: 'call_tool',
      name: 'prism_ask_user',
      arguments: {
        questionType: 'confirm',
        title: 'Do you want to proceed?',
        options: []
      },
      messageId: 'msg-ask-user',
      sessionId
    }));

    // Wait for the UI callback to be triggered
    await new Promise(r => setTimeout(r, 100));
    expect(questionMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 'msg-ask-user',
      type: 'confirm',
      title: 'Do you want to proceed?'
    }));

    // Answer the question via Prism interface
    adapter.answerPendingQuestion('msg-ask-user', { confirmed: true });

    // Verify WebSocket client receives the tool call response
    const result = await askUserPromise;
    expect(result).toBeDefined();
    expect(result.content[0].text).toContain('confirmed');

    // Close the connection
    client.terminate();
  });

  it('openSession actively wakes up Cursor and focuses on input.md', async () => {
    const execMock = exec as any;
    execMock.mockClear();

    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'Wakeup Test' });
    
    expect(execMock).toHaveBeenCalled();
    const lastCall = execMock.mock.calls[execMock.mock.calls.length - 1];
    expect(lastCall[0]).toContain('cursor --goto');
    expect(lastCall[0]).toContain('input.md');
  });

  it('GC closes and cleans up the temporary session directory', async () => {
    const sessionId = await adapter.openSession(tmpDir, { intentType: 'feature', text: 'GC Test' });
    const sessionDir = path.join(tmpDir, '.cursor', 'chat', sessionId);
    expect(fs.existsSync(sessionDir)).toBe(true);

    // Call stopWatchOutput to trigger GC
    await adapter.stopWatchOutput();
    expect(fs.existsSync(sessionDir)).toBe(false);
  });
});
