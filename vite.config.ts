import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "path";

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'GEMINI_'],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    },
    dedupe: ['react', 'react-dom']
  },
  server: {
    port: 8112,
    host: '127.0.0.1',
    allowedHosts: [
      'ultrassom.ai',
      'localhost',
      '127.0.0.1',
      '145.223.26.62'
    ],
    hmr: {
      clientPort: 8116,
      protocol: 'wss',
      host: 'ultrassom.ai',
    },
    proxy: {
      // Proxy matrix generation to dedicated server
      '/api/generate-matrix': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false
      },
      // Proxy other API requests to main backend server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 8112,
    host: 'ultrassom.ai'
  },
  build: {
    // PWA optimization
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false, // Disable in production for smaller bundle
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select'],
          'vendor-charts': ['recharts', 'd3'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-motion': ['framer-motion'],
          'vendor-db': ['dexie', 'dexie-react-hooks'],
        },
        // Optimize chunk file names for caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      }
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Better compression
    cssCodeSplit: true,
    // Inline small assets
    assetsInlineLimit: 4096,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'dexie',
      'dexie-react-hooks',
      'date-fns',
      'framer-motion',
    ],
    exclude: ['@tailwindcss/vite']
  },
  // PWA manifest and service worker handling
  publicDir: 'public',
});
