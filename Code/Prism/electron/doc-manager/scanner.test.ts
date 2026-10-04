import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanHelmDocs } from './scanner';

describe('DocManager Scanner — aligned with PRISM_PROJECT.md v0.1.0', () => {
  let mockProjectRoot: string;

  beforeEach(() => {
    mockProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-test-'));
  });

  afterEach(() => {
    fs.rmSync(mockProjectRoot, { recursive: true, force: true });
  });

  it('should return all 6 core Helm documents as EMPTY when docs directory does not exist', () => {
    const results = scanHelmDocs(mockProjectRoot);

    expect(results).toHaveLength(6);
    expect(results.every(doc => doc.status === 'EMPTY')).toBe(true);

    const titles = results.map(doc => doc.title);
    expect(titles).toEqual(expect.arrayContaining([
      'RESEARCH.md', 'CONTEXT.md', 'PRODUCT.md',
      'DESIGN.md', 'TASK.md', 'HANDOFF.md'
    ]));
    // ARCHITECTURE.md and PROGRESS.md must NOT appear
    expect(titles).not.toContain('ARCHITECTURE.md');
    expect(titles).not.toContain('PROGRESS.md');
    expect(titles).not.toContain('PROJECT.md');
  });

  it('should scan docs/ subfolder for RESEARCH, CONTEXT, PRODUCT, DESIGN', () => {
    const docsDir = path.join(mockProjectRoot, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'PRODUCT.md'), '# Product Spec\nFeatures...');
    fs.writeFileSync(path.join(docsDir, 'DESIGN.md'), '# Design\nColors...');

    const results = scanHelmDocs(mockProjectRoot);

    const productDoc = results.find(doc => doc.title === 'PRODUCT.md');
    expect(productDoc?.status).toBe('ACTIVE');
    expect(productDoc?.content).toContain('Product Spec');

    const designDoc = results.find(doc => doc.title === 'DESIGN.md');
    expect(designDoc?.status).toBe('ACTIVE');

    const researchDoc = results.find(doc => doc.title === 'RESEARCH.md');
    expect(researchDoc?.status).toBe('EMPTY');
  });

  it('should scan project root for TASK.md and HANDOFF.md', () => {
    fs.writeFileSync(path.join(mockProjectRoot, 'TASK.md'), '# Tasks\n| ID | Desc | Status |');
    fs.writeFileSync(path.join(mockProjectRoot, 'HANDOFF.md'), '# Handoff\nSession...');

    const results = scanHelmDocs(mockProjectRoot);

    const taskDoc = results.find(doc => doc.title === 'TASK.md');
    expect(taskDoc?.status).toBe('ACTIVE');
    expect(taskDoc?.content).toContain('Tasks');

    const handoffDoc = results.find(doc => doc.title === 'HANDOFF.md');
    expect(handoffDoc?.status).toBe('ACTIVE');
  });

  it('should return EMPTY for existing but empty files', () => {
    const docsDir = path.join(mockProjectRoot, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'CONTEXT.md'), '');
    fs.writeFileSync(path.join(mockProjectRoot, 'TASK.md'), '');

    const results = scanHelmDocs(mockProjectRoot);

    expect(results.find(doc => doc.title === 'CONTEXT.md')?.status).toBe('EMPTY');
    expect(results.find(doc => doc.title === 'TASK.md')?.status).toBe('EMPTY');
  });

  it('should return only valid DocStatus values from the spec', () => {
    const docsDir = path.join(mockProjectRoot, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'RESEARCH.md'), 'Research data');
    fs.writeFileSync(path.join(mockProjectRoot, 'HANDOFF.md'), 'Handoff');

    const results = scanHelmDocs(mockProjectRoot);
    const validStatuses = ['ACTIVE', 'LOCKED', 'PENDING', 'EMPTY', 'STALE'];

    for (const doc of results) {
      expect(validStatuses).toContain(doc.status);
    }
  });

  it('should fallback to EMPTY if readFileSync throws an error', () => {
    const docsDir = path.join(mockProjectRoot, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    // Create a directory where a file should be to force EISDIR
    fs.mkdirSync(path.join(docsDir, 'PRODUCT.md'));

    const results = scanHelmDocs(mockProjectRoot);
    const productDoc = results.find(doc => doc.title === 'PRODUCT.md');
    expect(productDoc?.status).toBe('EMPTY');
  });
});
