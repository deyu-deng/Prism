import { describe, it, expect } from 'vitest';
import { checkContextWarning, parseContextWarning } from './context-monitor';

describe('checkContextWarning', () => {
  it('detects [[CONTEXT_WARNING]] tag', () => {
    const output = 'Some IDE output\n[[CONTEXT_WARNING]]\nUsage: 85%\nDecisions: ["Use Supabase"]\n[[/CONTEXT_WARNING]]';
    const result = checkContextWarning(output);
    expect(result).not.toBeNull();
    expect(result?.usage).toBe('85%');
    expect(result?.decisions).toContain('Use Supabase');
  });

  it('returns null when no warning tag', () => {
    const result = checkContextWarning('Normal output without warning');
    expect(result).toBeNull();
  });

  it('parses multiple decisions', () => {
    const output = '[[CONTEXT_WARNING]]\nUsage: 92%\nDecisions: ["Use Supabase", "Use Tailwind", "Deploy to Vercel"]\n[[/CONTEXT_WARNING]]';
    const result = checkContextWarning(output);
    expect(result?.decisions).toHaveLength(3);
  });
});

describe('parseContextWarning', () => {
  it('extracts YAML-like content from warning block', () => {
    const block = 'Usage: 90%\nDecisions:\n  - Use Redis for cache\n  - Stripe for payments';
    const result = parseContextWarning(block);
    expect(result.usage).toBe('90%');
    expect(result.decisions).toContain('Use Redis for cache');
  });
});
