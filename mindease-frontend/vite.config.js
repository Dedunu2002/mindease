// vite.config.js
// This tells Vite: when React calls /api/..., forward it to Flask on port 5000
// This way React does not need to write http://localhost:5000 every time

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Any request starting with /api goes to Flask
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})