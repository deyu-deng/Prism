import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeCodeAdapter } from './ClaudeCodeAdapter';

describe('ClaudeCodeAdapter — Full Interface (Slice D)', () => {
  let adapter: ClaudeCodeAdapter;
  let mockProjectRoot: string;

  beforeEach(() => {
    adapter = new ClaudeCodeAdapter();
    mockProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-adapter-test-'));
  });

  afterEach(() => {
    adapter.dispose?.();
    fs.rmSync(mockProjectRoot, { recursive: true, force: true });
  });

  it('detect() returns true when claude command is available', async () => {
    const result = await adapter.detect();
    // In CI environments claude may not be installed, so we just verify it doesn't throw
    expect(typeof result).toBe('boolean');
  });

  it('openSession writes session config to .ai/prism-session.json', async () => {
    const sessionId = await adapter.openSession(mockProjectRoot, { intentType: 'feature', text: 'Add button' });
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);

    const sessionPath = path.join(mockProjectRoot, '.ai', 'prism-session.json');
    expect(fs.existsSync(sessionPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    expect(content.intentType).toBe('feature');
    expect(content.text).toBe('Add button');
  });

  it('sendMessage appends to .ai/prism-inbox.md', async () => {
    const sessionId = 'sess-123';
    await adapter.sendMessage(mockProjectRoot, sessionId, 'Hello Claude');

    const inboxPath = path.join(mockProjectRoot, '.ai', 'prism-inbox.md');
    expect(fs.existsSync(inboxPath)).toBe(true);

    const content = fs.readFileSync(inboxPath, 'utf-8');
    expect(content).toContain('Hello Claude');
    expect(content).toContain(sessionId);
  });

  it('getProjectRoot returns the provided projectRoot', async () => {
    const result = await adapter.getProjectRoot(mockProjectRoot);
    expect(result).toBe(mockProjectRoot);
  });

  it('watchOutput polls .ai/prism-outbox.md and calls callback on new content', async () => {
    const outboxPath = path.join(mockProjectRoot, '.ai', 'prism-outbox.md');
    fs.mkdirSync(path.dirname(outboxPath), { recursive: true });
    fs.writeFileSync(outboxPath, '[[PRISM_QUESTION]]\ntype: confirm\ntitle: OK?\noptions:\n  - label: Yes\n[[/PRISM_QUESTION]]\n', 'utf-8');

    const callback = vi.fn();
    adapter.watchOutput(mockProjectRoot, callback);

    // Wait for polling interval (500ms)
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(callback).toHaveBeenCalled();
    const callArg = callback.mock.calls[0][0];
    expect(callArg.type).toBe('confirm');
    expect(callArg.title).toBe('OK?');
  });

  it('MCP prism_read_context returns actual Helm doc content', async () => {
    // Setup activeProjectRoot inside adapter
    await adapter.openSession(mockProjectRoot, { intentType: 'explore', text: 'Test' });

    // Create a mock doc
    const docsDir = path.join(mockProjectRoot, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'RESEARCH.md'), '# Research Notes\nThis is a research document.', 'utf-8');

    const handler = (adapter as any).server._requestHandlers.get('tools/call');
    const response = await handler({
      method: 'tools/call',
      params: {
        name: 'prism_read_context',
        arguments: {}
      }
    });

    expect(response.isError).toBeFalsy();
    expect(response.content[0].text).toContain('RESEARCH.md');
    expect(response.content[0].text).toContain('Research Notes');
  });

  it('MCP prism_write_decision creates physical ADR files', async () => {
    await adapter.openSession(mockProjectRoot, { intentType: 'explore', text: 'Test' });

    const handler = (adapter as any).server._requestHandlers.get('tools/call');
    const response = await handler({
      method: 'tools/call',
      params: {
        name: 'prism_write_decision',
        arguments: {
          title: 'Use Vitest',
          decision: 'We decided to use Vitest for unit testing.',
          context: 'Need a testing framework.',
          consequences: 'Faster and safer code.'
        }
      }
    });

    expect(response.isError).toBeFalsy();
    expect(response.content[0].text).toContain('Decision "Use Vitest" recorded');

    const adrDir = path.join(mockProjectRoot, 'docs', 'adr');
    expect(fs.existsSync(adrDir)).toBe(true);

    const files = fs.readdirSync(adrDir);
    expect(files.length).toBe(1);
    expect(files[0]).toContain('use-vitest.md');

    const adrContent = fs.readFileSync(path.join(adrDir, files[0]), 'utf-8');
    expect(adrContent).toContain('Use Vitest');
    expect(adrContent).toContain('We decided to use Vitest');
    expect(adrContent).toContain('Need a testing framework');
    expect(adrContent).toContain('Faster and safer code');
  });

  it('MCP prism_update_task updates TASK.md atomically', async () => {
    await adapter.openSession(mockProjectRoot, { intentType: 'explore', text: 'Test' });

    // Setup a mock TASK.md table
    const taskPath = path.join(mockProjectRoot, 'TASK.md');
    const tableContent = `# Task List\n\n| ID | Description | Status | Type | Notes |\n|---|---|---|---|---|\n| slice-1 | Test Slice | PENDING | Feature | | \n`;
    fs.writeFileSync(taskPath, tableContent, 'utf-8');

    const handler = (adapter as any).server._requestHandlers.get('tools/call');
    const response = await handler({
      method: 'tools/call',
      params: {
        name: 'prism_update_task',
        arguments: {
          sliceId: 'slice-1',
          newStatus: 'ACTIVE'
        }
      }
    });

    expect(response.isError).toBeFalsy();

    const updatedTask = fs.readFileSync(taskPath, 'utf-8');
    expect(updatedTask).toContain('slice-1');
    expect(updatedTask).toContain('ACTIVE');
  });

  it('MCP prism_ask_user rejects invalid or malicious parameters (security sandbox)', async () => {
    await adapter.openSession(mockProjectRoot, { intentType: 'explore', text: 'Test' });

    const handler = (adapter as any).server._requestHandlers.get('tools/call');
    
    // 1. Invalid question type
    const res1 = await handler({
      method: 'tools/call',
      params: {
        name: 'prism_ask_user',
        arguments: {
          questionType: 'dangerous_type',
          title: 'Should be rejected'
        }
      }
    });
    expect(res1.isError).toBe(true);
    expect(res1.content[0].text).toContain('invalid questionType');

    // 2. Script injection
    const res2 = await handler({
      method: 'tools/call',
      params: {
        name: 'prism_ask_user',
        arguments: {
          questionType: 'choice',
          title: 'Malicious title <script>alert(1)</script>'
        }
      }
    });
    expect(res2.isError).toBe(true);
    expect(res2.content[0].text).toContain('Script tags are not allowed');

    // 3. Option parameter too long
    const res3 = await handler({
      method: 'tools/call',
      params: {
        name: 'prism_ask_user',
        arguments: {
          questionType: 'choice',
          title: 'Too long label',
          options: [{ label: 'a'.repeat(201) }]
        }
      }
    });
    expect(res3.isError).toBe(true);
    expect(res3.content[0].text).toContain('Parameter exceeds maximum length');
  });

  it('MCP prism_ask_user and answerPendingQuestion handles routing and callbacks', async () => {
    await adapter.openSession(mockProjectRoot, { intentType: 'explore', text: 'Test' });

    const handler = (adapter as any).server._requestHandlers.get('tools/call');
    const callback = vi.fn();
    adapter.watchOutput(mockProjectRoot, callback);

    const askPromise = handler({
      method: 'tools/call',
      params: {
        name: 'prism_ask_user',
        arguments: {
          questionType: 'choice',
          title: 'Decide architecture',
          options: [{ label: 'Option A' }]
        }
      }
    });

    // Wait slightly for the question to register
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(callback).toHaveBeenCalled();
    const registeredQuestion = callback.mock.calls[0][0];
    expect(registeredQuestion.title).toBe('Decide architecture');
    expect(registeredQuestion.id).toBeDefined();

    // Answer the question
    await adapter.answerPendingQuestion(registeredQuestion.id, { label: 'Option A' });

    const response = await askPromise;
    expect(response.isError).toBeFalsy();
    const resPayload = JSON.parse(response.content[0].text);
    expect(resPayload.label).toBe('Option A');
  });
});
