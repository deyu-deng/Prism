import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { writeADR } from './adr-writer';

describe('writeADR', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-adr-test-'));
    fs.mkdirSync(path.join(tmpDir, 'docs', 'adr'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('writes ADR file with standard format', async () => {
    const result = await writeADR(tmpDir, {
      title: 'Use Supabase vs Postgres',
      context: 'Need a database for user auth and storage',
      decision: 'Use Supabase',
      consequences: 'Faster setup, but vendor lock-in',
    });

    expect(fs.existsSync(result.filePath)).toBe(true);
    const content = fs.readFileSync(result.filePath, 'utf-8');
    expect(content).toContain('## Context');
    expect(content).toContain('## Decision');
    expect(content).toContain('## Consequences');
    expect(content).toContain('Supabase');
  });

  it('generates sequential ADR numbers', async () => {
    const r1 = await writeADR(tmpDir, { title: 'First', context: '', decision: '', consequences: '' });
    const r2 = await writeADR(tmpDir, { title: 'Second', context: '', decision: '', consequences: '' });

    expect(r1.fileName).toContain('ADR-001');
    expect(r2.fileName).toContain('ADR-002');
  });
});
