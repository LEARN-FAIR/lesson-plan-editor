import { defineConfig } from 'vite'
import symfonyPlugin from "vite-plugin-symfony";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    symfonyPlugin(),
  ],
  root: '.',
  base: '/build/',
  build: {
    rollupOptions: {
      input: {
        app: './src/js/index.tsx'
      },
      output: {
        // Disable hashing for predictable filenames
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
  },
})
