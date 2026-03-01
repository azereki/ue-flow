import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Plugin to inject CSS into the IIFE JS bundle at runtime.
 * In library mode, Vite emits CSS as a separate file. This plugin
 * reads that CSS and prepends JS code that creates a <style> element.
 */
function cssInjectedByJsPlugin(): Plugin {
  return {
    name: 'css-injected-by-js',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      // Find the CSS asset
      let cssCode = '';
      const cssKeys: string[] = [];
      for (const [key, chunk] of Object.entries(bundle)) {
        if (key.endsWith('.css') && chunk.type === 'asset') {
          cssCode += chunk.source;
          cssKeys.push(key);
        }
      }

      if (!cssCode) return;

      // Remove CSS assets from bundle
      for (const key of cssKeys) {
        delete bundle[key];
      }

      // Escape CSS for embedding in JS string
      const escaped = cssCode
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n');

      // Find the JS entry and prepend CSS injection code
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) {
          const injection = `(function(){var s=document.createElement('style');s.textContent='${escaped}';document.head.appendChild(s);})();\n`;
          chunk.code = injection + chunk.code;
          break;
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), cssInjectedByJsPlugin()],
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
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
    cssCodeSplit: false,
    assetsInlineLimit: 5 * 1024 * 1024, // 5MB — inline woff2 fonts as base64 in IIFE
  },
});
