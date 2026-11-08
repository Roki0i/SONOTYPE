import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_PAGES_BUILD === 'true' ? '/SONOTYPE/' : '/',
  server: {host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: {'/api/export': {target: 'http://127.0.0.1:8787', changeOrigin: true}}},
  preview: {host: '127.0.0.1', port: 4173, strictPort: true},
  build: {outDir: 'dist', emptyOutDir: true},
});
