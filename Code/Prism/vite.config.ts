import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'block-non-src-reload',
      handleHotUpdate({ file, server }) {
        const normalized = file.replace(/\\/g, '/');
        if (
          normalized.match(/(^|\/)dist-electron\//) ||
          normalized.match(/(^|\/)dist\//) ||
          normalized.match(/(^|\/)\.ai\//) ||
          normalized.match(/(^|\/)\.antigravity\//) ||
          normalized.match(/(^|\/)\.cursor\//) ||
          normalized.endsWith('CLAUDE.md') ||
          normalized.endsWith('.cursorrules') ||
          normalized.endsWith('.windsurfrules') ||
          normalized.endsWith('TASK.md') ||
          normalized.endsWith('HANDOFF.md') ||
          normalized.match(/(^|\/)docs\//)
        ) {
          return [];
        }
      },
    },
  ],
  base: './',
  clearScreen: false,
  server: {
    port: 1435,
    strictPort: true,
    host: "127.0.0.1",
    watch: {
      ignored: [
        '**/dist-electron/**',
        '**/dist/**',
        '**/.ai/**',
        '**/.antigravity/**',
        '**/.cursor/**',
        '**/CLAUDE.md',
        '**/.cursorrules',
        '**/.windsurfrules',
        '**/TASK.md',
        '**/HANDOFF.md',
        '**/docs/**',
      ],
    },
  },
});
