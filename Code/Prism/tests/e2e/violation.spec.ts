import { test, expect } from '@playwright/test';
import { detectViolations, generateCorrection } from '../../electron/helm/violation-detector';

test.describe('Helm Violation Detection', () => {
  test('detects horizontal layering in Chinese output', () => {
    const output = '好的，我先把所有表建好，然后再写前端';
    const violations = detectViolations(output);
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].type).toBe('horizontal-layering');
  });

  test('detects skip-tests pattern', () => {
    const output = '测试后面再补，先把功能写完';
    const violations = detectViolations(output);
    expect(violations.map((v: any) => v.type)).toContain('skip-tests');
  });

  test('generates correction with vertical-slice keyword', () => {
    const correction = generateCorrection({ type: 'horizontal-layering', severity: 'warn', message: '' });
    expect(correction).toContain('垂直切片');
  });
});
