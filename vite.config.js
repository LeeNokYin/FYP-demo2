import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig({
  // Relative base avoids nested repo paths for vite-plugin-cesium on GitHub Pages.
  base: './',
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
