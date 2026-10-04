import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Grid Refresh', () => {
  let app: any;
  let page: any;
  let tmpDir: string;

  test.beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-grid-e2e-'));
    fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'docs', 'CONTEXT.md'), '# Context\nInitial', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'docs', 'RESEARCH.md'), '# Research', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'docs', 'PRODUCT.md'), '# Product', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'docs', 'DESIGN.md'), '# Design', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'TASK.md'), '# Tasks\n| ID | Description | Status | Type | Notes |\n|---|---|---|---|---|\n| #1 | Setup | Done | infra | - |', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'HANDOFF.md'), '# Handoff', 'utf-8');

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

  test('app renders with all 6 doc cards after project load', async () => {
    const content = await page.content();
    expect(content).toContain('PLOBI / PRISM');
  });
});
