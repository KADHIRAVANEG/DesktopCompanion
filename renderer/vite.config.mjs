import { defineConfig } from 'vite';

// Standalone renderer bundle for the Electron mascot & settings windows.
// Separate from the TanStack Start app (which is the marketing site).
export default defineConfig({
  root: __dirname,
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        mascot: new URL('./index.html', import.meta.url).pathname,
        settings: new URL('./settings.html', import.meta.url).pathname,
      },
    },
  },
});
