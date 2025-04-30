import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  server: {
    port: 3002,
    host: true,
    cors: true,
    hmr: {
      overlay: true
    }
  },
  build: {
    sourcemap: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[ext]',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js'
      }
    }
  },
  css: {
    devSourcemap: true
  },
  logLevel: 'info',
  clearScreen: false,
  define: {
    'process.env.NODE_ENV': `"${mode}"`,
    'process.env.DEBUG': mode === 'development' ? 'true' : 'false'
  },
  optimizeDeps: {
    include: ['axios']
  },
  esbuild: {
    jsxInject: `import React from 'react'`,
    define: {
      'process.env.NODE_ENV': `"${mode}"`
    }
  }
}));
