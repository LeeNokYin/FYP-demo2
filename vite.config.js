import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig({
  base: '/FYP-demo2/',
  plugins: [react(), cesium()],
  server: {
    proxy: {
      '/api': {
        target: 'https://eaplanner.odensystems.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/Api')
      }
    }
  }
})
