import { defineConfig } from 'vite';
import { resolve } from 'path';

/** Bundle content script as a single IIFE (no ES imports — required by Chrome). */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/overlay.ts'),
      name: 'BrowserShellOverlay',
      formats: ['iife'],
      fileName: () => 'content/overlay.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});