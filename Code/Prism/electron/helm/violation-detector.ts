export interface Violation {
  type: 'horizontal-layering' | 'skip-tests' | 'override-locked' | 'no-feedback-loop';
  severity: 'warn' | 'block';
  message: string;
}

const RULES = [
  {
    type: 'horizontal-layering' as const,
    severity: 'warn' as const,
    pattern: /(先建所有表|先写所有 API|先把数据库层做完|先把所有表建好|先把后端写完)/i,
    message: 'IDE 输出包含"先建所有表" → 违反垂直切片原则',
  },
  {
    type: 'skip-tests' as const,
    severity: 'warn' as const,
    pattern: /(测试后面补|先写代码|测试跳过|测试后面再补|先把功能写完)/i,
    message: 'AI 试图跳过测试阶段',
  },
  {
    type: 'no-feedback-loop' as const,
    severity: 'warn' as const,
    pattern: null, // handled manually below
    message: '连续 500+ 字输出但未包含测试代码',
  },
];

/**
 * Scan IDE output for Helm anti-patterns.
 */
export function detectViolations(output: string): Violation[] {
  const violations: Violation[] = [];

  for (const rule of RULES) {
    if (rule.pattern && rule.pattern.test(output)) {
      violations.push({
        type: rule.type,
        severity: rule.severity,
        message: rule.message,
      });
    }
  }

  // Rule: no-feedback-loop — long output without test markers
  if (output.length >= 500) {
    const hasTestCode = /\b(describe|it|test)\s*\(/.test(output);
    if (!hasTestCode) {
      violations.push({
        type: 'no-feedback-loop',
        severity: 'warn',
        message: '连续 50000+ 字输出但未包含测试代码',
      });
    }
  }

  return violations;
}

/**
 * Generate a correction prompt snippet for the given violation.
 */
export function generateCorrection(violation: Violation): string {
  switch (violation.type) {
    case 'horizontal-layering':
      return '【Helm 约束修正】请遵守垂直切片原则，每个 Issue 必须是端到端可演示的功能。禁止先完成所有数据库层再写前端。';
    case 'skip-tests':
      return '【Helm 约束修正】测试不是可选项。每个功能切片必须包含对应的自动化测试。禁止跳过测试阶段。';
    case 'no-feedback-loop':
      return '【Helm 约束修正】你已连续输出大量代码但未提供测试。请立即为刚才实现的代码编写测试用例（describe/it/test）。';
    case 'override-locked':
      return '【Helm 约束修正】检测到对锁定需求（LOCKED）的修改。请停止修改已冻结的上下文，如有必要通过 ADR 流程申请变更。';
    default:
      return '【Helm 约束修正】请重新审视当前输出是否符合 Helm 工程原则。';
  }
}

/**
 * Write correction instructions to the project's .ai directory.
 */
export async function injectCorrection(
  projectRoot: string,
  violations: Violation[]
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const aiDir = path.join(projectRoot, '.ai');
  await fs.mkdir(aiDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const content = violations
    .map((v) => `[[PRISM_CORRECTION]]\nTYPE: ${v.type}\nSEVERITY: ${v.severity}\nTIMESTAMP: ${timestamp}\n${generateCorrection(v)}\n`)
    .join('\n');

  await fs.writeFile(path.join(aiDir, 'prism-correction.md'), content, 'utf-8');
}
