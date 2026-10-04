import { describe, it, expect } from 'vitest';

describe('IPC Handlers', () => {
  it('has all required handler names defined', () => {
    const handlers = [
      'select_project_dir',
      'scan_helm_docs',
      'inject_system_prompt',
      'set_active_ide',
      'dispatch_intent',
      'answer_question',
      'update_task_status',
      'propose_options',
      'commit_decision',
      'open_in_ide',
      'delegate_intent_to_gui',
      'initialize_project',
      'migrate_project',
      'write_adr',
    ];

    expect(handlers).toHaveLength(14);
    expect(handlers.every((h) => typeof h === 'string')).toBe(true);
  });
});
