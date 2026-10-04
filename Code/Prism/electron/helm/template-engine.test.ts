import { describe, it, expect } from 'vitest';
import { renderSystemPrompt } from './template-engine';

describe('Template Engine', () => {
  const mockContext = {
    taskType: 'feature' as const,
    currentPhase: 'explore' as const,
    contextSummary: 'Project is a todo app using React + Supabase.',
    taskSummary: 'Slice #1: Create todo. Slice #2: Delete todo.',
  };

  it('renders the explore template and replaces all mustache variables', () => {
    const result = renderSystemPrompt('explore', mockContext);

    expect(result).toContain('# Prism Helm 工作流约束');
    expect(result).toContain('任务类型：feature');
    expect(result).toContain('当前阶段：explore');
    expect(result).toContain('Project is a todo app using React + Supabase.');
    expect(result).toContain('Slice #1: Create todo. Slice #2: Delete todo.');
  });

  it('includes the [[PRISM_QUESTION]] format constraint', () => {
    const result = renderSystemPrompt('explore', mockContext);
    expect(result).toContain('[[PRISM_QUESTION]]');
    expect(result).toContain('[[/PRISM_QUESTION]]');
    expect(result).toContain('type: choice | confirm | input | multi_select');
  });

  it('throws for unknown phase templates', () => {
    expect(() => renderSystemPrompt('nonexistent' as any, mockContext)).toThrow('System prompt template not found');
  });

  it('renders design template correctly with different context', () => {
    const ctx = {
      taskType: 'bugfix' as const,
      currentPhase: 'design' as const,
      contextSummary: 'Auth flow is broken.',
      taskSummary: 'Fix login redirect.',
    };
    const result = renderSystemPrompt('design', ctx);
    expect(result).toContain('任务类型：bugfix');
    expect(result).toContain('当前阶段：design');
  });
});
