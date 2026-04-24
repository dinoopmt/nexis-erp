import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',  // Use relative paths for Electron file:// URLs
  plugins: [
    react({
      babel: {
        babelrc: true,
        configFile: true,
      },
      jsxImportSource: 'react',
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/images': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    middlewareMode: false,
    preTransformRequests: false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'axios',
      'lucide-react',
      'react-hot-toast',
      'ag-grid-community',
    ],
    exclude: ['node_modules/.pnpm'],
  },
})
