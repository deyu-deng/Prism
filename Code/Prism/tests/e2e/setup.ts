import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';

let electronApp: ElectronApplication | null = null;

export async function launchApp(): Promise<ElectronApplication> {
  if (electronApp) return electronApp;

  const electronPath = require.resolve('electron');
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../electron/main.ts')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  return electronApp;
}

export async function getFirstWindow(app: ElectronApplication): Promise<Page> {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return page;
}

export async function closeApp(): Promise<void> {
  if (electronApp) {
    await electronApp.close();
    electronApp = null;
  }
}
