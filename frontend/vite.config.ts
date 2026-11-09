import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api/v1/executive': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],
})
