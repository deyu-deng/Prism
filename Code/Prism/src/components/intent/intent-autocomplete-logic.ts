import templates from '../../lib/intent-templates.json';

export interface IntentTemplate {
  label: string;
  category: 'feature' | 'bugfix' | 'explore' | 'refactor';
  phase: string;
  skill: string;
}

const ALL_TEMPLATES: IntentTemplate[] = templates.templates as IntentTemplate[];

/**
 * 返回默认的前 5 个模板（输入为空时使用）
 */
export function getDefaultTemplates(): IntentTemplate[] {
  return ALL_TEMPLATES.slice(0, 5);
}

/**
 * 根据输入做模糊匹配（includes），返回最多 5 项
 * 空输入返回空数组（由调用方决定是否显示默认列表）
 */
export function filterTemplates(input: string): IntentTemplate[] {
  if (!input) return [];
  const lower = input.toLowerCase();
  return ALL_TEMPLATES.filter((t) =>
    t.label.toLowerCase().includes(lower)
  ).slice(0, 5);
}

/**
 * 根据输入获取补全列表：空输入返回默认 5 个，否则做过滤
 */
export function getCompletions(input: string): IntentTemplate[] {
  if (!input.trim()) return getDefaultTemplates();
  return filterTemplates(input);
}
