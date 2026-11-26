import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base './' guarantees AETHER runs cleanly on any GitHub Pages subpath
// (e.g. https://<username>.github.io/aether-os/) as well as Capacitor Android WebView
// without colliding with other apps hosted on the same GitHub Pages domain.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
