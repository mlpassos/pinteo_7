import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./web', import.meta.url)),
  publicDir: false,
  resolve: { alias: { '/src': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5177,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url))] },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist/web', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
});
