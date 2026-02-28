import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'UEFlow',
      formats: ['iife'],
      fileName: () => 'ue-flow.iife.js',
    },
    rollupOptions: {
      // Do NOT externalize — inline everything for self-contained HTML
    },
    outDir: 'dist',
    cssCodeSplit: false, // Inline CSS into JS
  },
});
