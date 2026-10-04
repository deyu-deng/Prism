import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initializeProject, migrateProject } from './index';
import { installGitHooks } from './githooks';
import { scanHelmDocs } from './scanner';

describe('DocManager.initialize', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates docs/ directory and 6 core Helm documents', async () => {
    await initializeProject(tmpDir);

    expect(fs.existsSync(path.join(tmpDir, 'docs'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'RESEARCH.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'CONTEXT.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'PRODUCT.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'DESIGN.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'TASK.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'HANDOFF.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'adr'))).toBe(true);
  });

  it('generates non-empty template files', async () => {
    await initializeProject(tmpDir);

    const docs = scanHelmDocs(tmpDir);
    expect(docs).toHaveLength(6);
    expect(docs.every((d) => d.status === 'ACTIVE')).toBe(true);
    expect(docs.every((d) => d.content.trim().length > 0)).toBe(true);
  });

  it('returns an InitSummary with created files list', async () => {
    const summary = await initializeProject(tmpDir);
    expect(summary.created).toHaveLength(7);
    expect(summary.created).toContain('docs/RESEARCH.md');
    expect(summary.created).toContain('TASK.md');
  });
});

describe('DocManager.migrate', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('migrates README.md content into CONTEXT.md', async () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# MyApp\n\nA cool app built with React.', 'utf-8');

    const summary = await migrateProject(tmpDir);

    expect(summary.migrated).toContain('README.md → CONTEXT.md');
    const contextPath = path.join(tmpDir, 'docs', 'CONTEXT.md');
    expect(fs.existsSync(contextPath)).toBe(true);
    const content = fs.readFileSync(contextPath, 'utf-8');
    expect(content).toContain('MyApp');
    expect(content).toContain('React');
  });

  it('migrates TODO.md items into TASK.md', async () => {
    fs.writeFileSync(path.join(tmpDir, 'TODO.md'), '- [ ] Fix login bug\n- [ ] Add dark mode', 'utf-8');

    const summary = await migrateProject(tmpDir);

    expect(summary.migrated).toContain('TODO.md → TASK.md');
    const taskPath = path.join(tmpDir, 'TASK.md');
    expect(fs.existsSync(taskPath)).toBe(true);
    const content = fs.readFileSync(taskPath, 'utf-8');
    expect(content).toContain('Fix login bug');
    expect(content).toContain('Add dark mode');
  });
});

describe('installGitHooks', () => {
  let tmpDir: string;
  let hooksDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-test-'));
    hooksDir = path.join(tmpDir, '.git', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('writes pre-push and pre-commit hooks', async () => {
    await installGitHooks(tmpDir);

    expect(fs.existsSync(path.join(hooksDir, 'pre-push'))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'pre-commit'))).toBe(true);
  });

  it('pre-push hook blocks AI push', async () => {
    await installGitHooks(tmpDir);

    const prePush = fs.readFileSync(path.join(hooksDir, 'pre-push'), 'utf-8');
    expect(prePush).toContain('AI push blocked by Prism');
  });

  it('pre-commit hook checks for dangerous patterns', async () => {
    await installGitHooks(tmpDir);

    const preCommit = fs.readFileSync(path.join(hooksDir, 'pre-commit'), 'utf-8');
    expect(preCommit).toContain('rm -rf');
    expect(preCommit).toContain('DROP TABLE');
  });
});
