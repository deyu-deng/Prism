import { describe, it, expect } from 'vitest';
import { parseQuestionBlocks } from './question-parser';

describe('parseQuestionBlocks', () => {
  it('解析标准 choice 格式', () => {
    const raw = `
Some text before
[[PRISM_QUESTION]]
type: choice
phase: explore
title: 你想要哪种认证方案？
options:
  - label: A. 极简本地方案
    detail: 只需邮箱+密码
  - label: B. Google OAuth
    detail: 一键登录
  - label: C. 其他想法
    input: true
[[/PRISM_QUESTION]]
Some text after
`;
    const results = parseQuestionBlocks(raw);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('choice');
    expect(results[0].title).toBe('你想要哪种认证方案？');
    expect(results[0].options).toHaveLength(3);
    expect(results[0].options?.[2].input).toBe(true);
  });

  it('解析多个连续 QUESTION 块', () => {
    const raw = `
[[PRISM_QUESTION]]
type: confirm
title: Confirm this?
options:
  - label: Yes
  - label: No
[[/PRISM_QUESTION]]

[[PRISM_QUESTION]]
type: input
title: What is your name?
[[/PRISM_QUESTION]]
`;
    const results = parseQuestionBlocks(raw);
    expect(results).toHaveLength(2);
    expect(results[0].type).toBe('confirm');
    expect(results[1].type).toBe('input');
  });

  it('空字符串输入返回空数组', () => {
    expect(parseQuestionBlocks('')).toEqual([]);
    expect(parseQuestionBlocks('   ')).toEqual([]);
  });

  it('格式不完整时优雅降级（不崩溃）', () => {
    const raw = `
[[PRISM_QUESTION]]
type: choice
[[/PRISM_QUESTION]]

[[PRISM_QUESTION]]
this is not yaml at all
[[/PRISM_QUESTION]]
`;
    const results = parseQuestionBlocks(raw);
    // Should not throw and should return whatever could be parsed
    expect(Array.isArray(results)).toBe(true);
  });

  it('LLM 包裹 Markdown 代码块时正确剥离', () => {
    const raw = `
\`\`\`yaml
[[PRISM_QUESTION]]
type: multi_select
title: Select features
options:
  - label: Feature A
  - label: Feature B
[[/PRISM_QUESTION]]
\`\`\`
`;
    const results = parseQuestionBlocks(raw);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('multi_select');
    expect(results[0].options).toHaveLength(2);
  });
});
