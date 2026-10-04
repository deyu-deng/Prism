import { describe, it, expect } from 'vitest';
import { filterTemplates, getDefaultTemplates } from './intent-autocomplete-logic';

describe('IntentAutocomplete Logic', () => {
  it('空输入时返回前 5 个默认模板', () => {
    const result = getDefaultTemplates();
    expect(result).toHaveLength(5);
  });

  it('输入"修复"后过滤出 bugfix 相关模板', () => {
    const result = filterTemplates('修复');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((t) => {
      expect(t.label).toContain('修复');
    });
  });

  it('输入"登录"后过滤出包含"登录"的模板', () => {
    const result = filterTemplates('登录');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((t) => {
      expect(t.label).toContain('登录');
    });
  });

  it('过滤结果最多返回 5 项', () => {
    const result = filterTemplates('');
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('不匹配任何模板时返回空数组', () => {
    const result = filterTemplates('xyzxyzxyz_不存在');
    expect(result).toHaveLength(0);
  });

  it('过滤结果包含 label、category、skill 字段', () => {
    const result = getDefaultTemplates();
    expect(result[0]).toHaveProperty('label');
    expect(result[0]).toHaveProperty('category');
    expect(result[0]).toHaveProperty('skill');
  });
});
