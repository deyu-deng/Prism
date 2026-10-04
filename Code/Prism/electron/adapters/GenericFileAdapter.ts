import { IDEAdapter } from './types';
import * as path from 'path';
import * as fs from 'fs/promises';

export class GenericFileAdapter implements IDEAdapter {
  id = 'generic-file';
  name = 'Generic File Adapter';

  async dispatchIntent(intentType: string, text: string, projectRoot: string): Promise<void> {
    const aiDir = path.join(projectRoot, '.ai');
    try {
      await fs.mkdir(aiDir, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }

    const intentFile = path.join(aiDir, 'prism-intent.md');
    const timestamp = new Date().toISOString();

    const content = `[[PRISM_QUESTION]]\nTYPE: ${intentType}\nINTENT: ${text}\nTIMESTAMP: ${timestamp}\n`;

    await fs.writeFile(intentFile, content, 'utf-8');
  }
}
