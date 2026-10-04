import { defineConfig } from 'vite';
import { builtinModules } from 'module';
import { createRequire } from 'module';
import * as path from 'path';
import * as fs from 'fs';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

// Electron main/preload run in Node — npm packages must be loaded from
// node_modules at runtime, NOT bundled. Bundling causes Rollup to pick the
// browser export of packages like `ws` (which has no `WebSocketServer`),
// crashing the main process at module load.
const nodeDeps = Object.keys(pkg.dependencies ?? {});

export default defineConfig({
  clearScreen: false,
  build: {
    watch: {
      exclude: ['dist-electron/**']
    },
    outDir: 'dist-electron',
    emptyOutDir: false,
    copyPublicDir: false,
    minify: false,
    sourcemap: true,
    lib: {
      entry: {
        main: 'electron/main.ts',
        preload: 'electron/preload.ts',
      },
      formats: ['cjs'],
    },
    rollupOptions: {
      treeshake: false,
      plugins: [
        {
          // Copy system-prompt templates into dist-electron/helm/system-prompts/
          // so that __dirname-relative paths resolve correctly at runtime.
          name: 'copy-system-prompts',
          closeBundle() {
            const src = path.resolve('electron/helm/system-prompts');
            const dest = path.resolve('dist-electron/helm/system-prompts');
            fs.mkdirSync(dest, { recursive: true });
            let copied = 0;
            for (const file of fs.readdirSync(src)) {
              const srcPath = path.join(src, file);
              const destPath = path.join(dest, file);
              let shouldCopy = true;
              if (fs.existsSync(destPath)) {
                const srcStat = fs.statSync(srcPath);
                const destStat = fs.statSync(destPath);
                if (srcStat.mtimeMs <= destStat.mtimeMs) {
                  shouldCopy = false;
                }
              }
              if (shouldCopy) {
                fs.copyFileSync(srcPath, destPath);
                copied++;
              }
            }
            if (copied > 0) {
              console.log('[copy-system-prompts] Copied templates to', dest);
            }
          },
        },
      ],
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        ...nodeDeps,
        // Match deep imports e.g. `@modelcontextprotocol/sdk/server/index.js`
        ...nodeDeps.map(d => new RegExp(`^${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`)),
      ],
      output: {
        entryFileNames: '[name].cjs',
      },
    },
  },
});
