import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Project Initialization', () => {
  let app: any;
  let page: any;
  let tmpDir: string;

  test.beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-init-e2e-'));
    const env = { ...process.env, NODE_ENV: 'production' } as Record<string, string>;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.cjs')],
      env,
    });
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await app?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('shows zero state for empty project', async () => {
    // Verify the app renders the zero-state message
    const content = await page.content();
    expect(content).toContain('PLOBI / PRISM');
    expect(content).toContain('打开项目');
  });

  test('initialize_project creates 6 core docs', async () => {
    const { initializeProject } = await import('../../electron/doc-manager/index');
    const result = await initializeProject(tmpDir);
    expect(result.created).toHaveLength(7); // 6 docs + docs/adr/
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'CONTEXT.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'TASK.md'))).toBe(true);
  });
});
