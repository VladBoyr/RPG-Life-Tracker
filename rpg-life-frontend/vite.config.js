import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command }) => {
  const isProduction = command === 'build';

  return {
    plugins: [react()],
    base: isProduction ? '/static/' : '/', 
    build: {
      outDir: path.resolve(__dirname, '../build/static'),
      manifest: true,
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/admin': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/static/admin': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/favicon.ico': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
