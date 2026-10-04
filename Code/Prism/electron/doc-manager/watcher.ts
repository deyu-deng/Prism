import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { BrowserWindow } from 'electron';
import type { DocStatus, HelmDoc } from './scanner';

let currentWatcher: chokidar.FSWatcher | null = null;

/**
 * Watch Helm document paths per PRISM_PROJECT.md §5.1:
 * - docs/*.md  (RESEARCH.md, CONTEXT.md, PRODUCT.md, DESIGN.md)
 * - TASK.md    (project root)
 * - HANDOFF.md (project root)
 */
export function watchHelmDocs(projectRoot: string, mainWindow: BrowserWindow) {
  if (currentWatcher) {
    currentWatcher.close();
  }

  const patterns = [
    path.join(projectRoot, 'docs', '*.md'),
    path.join(projectRoot, 'TASK.md'),
    path.join(projectRoot, 'HANDOFF.md'),
  ];

  currentWatcher = chokidar.watch(patterns, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  const handleUpdate = (filePath: string) => {
    const title = path.basename(filePath);
    let status: DocStatus = 'EMPTY';
    let content = '';

    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          content = fs.readFileSync(filePath, 'utf-8');
          if (content.trim().length > 0) {
            status = 'ACTIVE';
          }
        }
      }
    } catch (e) {
      // Keep EMPTY
    }

    const payload: HelmDoc = {
      title,
      status,
      content,
    };

    mainWindow.webContents.send('helm-doc-changed', payload);
  };

  currentWatcher.on('change', handleUpdate);
  currentWatcher.on('add', handleUpdate);
  currentWatcher.on('unlink', handleUpdate);
  currentWatcher.on('error', (err) => {
    console.error(`$> IO.ERROR: chokidar watcher error: ${err.message}`);
  });
}
