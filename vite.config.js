import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base matches the GitHub Pages project path (https://<user>.github.io/evidence-hedge/).
export default defineConfig({
  base: '/evidence-hedge/',
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
})
