import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * SPA build for Cloudflare Pages deployment.
 *
 * Unlike the default vite.config.ts (library/IIFE mode), this produces a
 * standard index.html + hashed JS/CSS assets suitable for static hosting.
 *
 * Usage: vite build --config vite.config.pages.ts
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-pages',
    // Standard SPA — no lib mode
    rollupOptions: {
      input: 'index.html',
    },
  },
});
