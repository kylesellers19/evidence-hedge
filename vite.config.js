import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is the domain root: the site is served at https://evidencehedge.org/.
export default defineConfig({
  base: '/',
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
