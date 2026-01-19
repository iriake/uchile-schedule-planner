import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ucursos-api': {
        target: 'https://www.u-cursos.cl',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ucursos-api/, ''),
      },
    },
  },
})
