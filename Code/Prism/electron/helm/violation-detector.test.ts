import { describe, it, expect } from 'vitest';
import { detectViolations, generateCorrection } from './violation-detector';

describe('detectViolations', () => {
  it('detects horizontal layering violation', () => {
    const output = '好的，我先把所有表建好，然后再写前端';
    const violations = detectViolations(output);
    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe('horizontal-layering');
    expect(violations[0].severity).toBe('warn');
  });

  it('detects skip-tests violation', () => {
    const output = '测试后面再补，先把功能写完';
    const violations = detectViolations(output);
    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe('skip-tests');
    expect(violations[0].severity).toBe('warn');
  });

  it('detects no-feedback-loop violation when no tests in long output', () => {
    const output = 'A'.repeat(600);
    const violations = detectViolations(output);
    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe('no-feedback-loop');
    expect(violations[0].severity).toBe('warn');
  });

  it('returns empty array for compliant output with tests', () => {
    const output =
      'Implementing the feature with vertical slices. Here is the test: describe("feature", () => { it("works", () => {}); });';
    const violations = detectViolations(output);
    expect(violations).toHaveLength(0);
  });

  it('returns empty array for short output without tests', () => {
    const output = 'Just a short confirmation.';
    const violations = detectViolations(output);
    expect(violations).toHaveLength(0);
  });

  it('detects multiple violations in one output', () => {
    const output = '先把所有表建好，测试后面再补';
    const violations = detectViolations(output);
    expect(violations.length).toBeGreaterThanOrEqual(2);
    expect(violations.map((v) => v.type)).toContain('horizontal-layering');
    expect(violations.map((v) => v.type)).toContain('skip-tests');
  });
});

describe('generateCorrection', () => {
  it('generates vertical-slice correction for horizontal-layering', () => {
    const correction = generateCorrection({ type: 'horizontal-layering', severity: 'warn', message: '' });
    expect(correction).toContain('垂直切片');
  });

  it('generates test-first correction for skip-tests', () => {
    const correction = generateCorrection({ type: 'skip-tests', severity: 'warn', message: '' });
    expect(correction).toContain('测试');
  });

  it('generates feedback-loop correction for no-feedback-loop', () => {
    const correction = generateCorrection({ type: 'no-feedback-loop', severity: 'warn', message: '' });
    expect(correction).toContain('测试');
  });
});
