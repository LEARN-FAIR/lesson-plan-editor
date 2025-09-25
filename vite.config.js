import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import symfonyPlugin from "vite-plugin-symfony";

export default defineConfig({
  plugins: [symfonyPlugin()],
  build: {
    outDir: 'public/build',
    emptyOutDir: true,
    manifest: 'manifest.json',
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'src/js/index.tsx')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/js')
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    https: {
      key: path.resolve(__dirname, 'ssl/localhost.key'),
      cert: path.resolve(__dirname, 'ssl/localhost.crt')
    },
    proxy: {
      '/api': {
        target: 'https://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
