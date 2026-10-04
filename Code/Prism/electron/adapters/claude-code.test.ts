import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeCodeAdapter } from './ClaudeCodeAdapter';

describe('ClaudeCodeAdapter — injectSystemPrompt', () => {
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

  it('override mode writes CLAUDE.md from scratch', async () => {
    const prompt = '# Prism Helm 工作流约束\n## 当前任务上下文\n- taskType: feature';
    await adapter.injectSystemPrompt(mockProjectRoot, prompt, 'override');

    const content = fs.readFileSync(path.join(mockProjectRoot, 'CLAUDE.md'), 'utf-8');
    expect(content).toBe(prompt);
  });

  it('append mode replaces the 当前任务上下文 section when it exists', async () => {
    const existing = `# Prism Helm 工作流约束\n\n## 当前任务上下文\n- old: data\n\n## Core Rules\n- rule 1`;
    fs.writeFileSync(path.join(mockProjectRoot, 'CLAUDE.md'), existing, 'utf-8');

    const newPrompt = `# Prism Helm 工作流约束\n\n## 当前任务上下文\n- taskType: bugfix\n- phase: debug\n\n## Core Rules\n- updated rule`;
    await adapter.injectSystemPrompt(mockProjectRoot, newPrompt, 'append');

    const content = fs.readFileSync(path.join(mockProjectRoot, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('taskType: bugfix');
    expect(content).toContain('phase: debug');
    expect(content).toContain('rule 1'); // Core Rules section preserved
    expect(content).not.toContain('old: data');
  });

  it('append mode prepends when CLAUDE.md does not exist', async () => {
    const newPrompt = '# New Prompt\n## Section';
    await adapter.injectSystemPrompt(mockProjectRoot, newPrompt, 'append');

    const content = fs.readFileSync(path.join(mockProjectRoot, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('New Prompt');
  });

  it('append mode prepends when 当前任务上下文 section is missing', async () => {
    const existing = '# Some Other Doc\n## Other Section';
    fs.writeFileSync(path.join(mockProjectRoot, 'CLAUDE.md'), existing, 'utf-8');

    const newPrompt = '# Prism Helm\n## 当前任务上下文\n- task: feature';
    await adapter.injectSystemPrompt(mockProjectRoot, newPrompt, 'append');

    const content = fs.readFileSync(path.join(mockProjectRoot, 'CLAUDE.md'), 'utf-8');
    expect(content.indexOf('Prism Helm')).toBeLessThan(content.indexOf('Other Section'));
  });
});
