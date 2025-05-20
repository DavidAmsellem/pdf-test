// electron.vite.config.js
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { createVuePlugin } from 'vite-plugin-vue2';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [createVuePlugin()],
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@': resolve(__dirname, 'src'),
      },
    },
    plugins: [react()],
    optimizeDeps: {
      include: ['pdfjs-dist'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            pdfjs: ['pdfjs-dist'],
          },
        },
      },
    },
  },
});