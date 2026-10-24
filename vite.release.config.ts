import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config.js';

/** Prévia local do build em portas isoladas, sem afetar a aplicação de desenvolvimento. */
export default mergeConfig(
  base,
  defineConfig({
    preview: {
      host: '127.0.0.1',
      port: 5190,
      strictPort: true,
      proxy: { '/api': { target: 'http://127.0.0.1:5198', changeOrigin: false } },
    },
  }),
);
