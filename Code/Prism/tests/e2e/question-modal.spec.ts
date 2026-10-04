import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright-core';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

test.describe('Question Modal', () => {
  let app: any;
  let page: any;

  test.beforeEach(async () => {
    const env = { ...process.env, NODE_ENV: 'production' } as Record<string, string>;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.cjs')],
      env,
      executablePath: path.join(require.resolve('electron'), '../dist/electron.exe'),
    });
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await app?.close();
  });

  test('modal layer is not visible when no question', async () => {
    const modal = await page.$('[class*="fixed inset-0 z-[100]"]');
    // Modal layer only renders when there's an active question
    expect(modal).toBeNull();
  });
});
