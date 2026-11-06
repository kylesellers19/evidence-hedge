import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// ENGINE_VERSION: the short SHA of the commit being built (GITHUB_SHA in CI),
// shown in the results footer so a live page names the engine that scored it.
function engineVersion() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

// base is the domain root: the site is served at https://evidencehedge.org/.
export default defineConfig({
  base: '/',
  plugins: [react()],
  define: {
    __ENGINE_VERSION__: JSON.stringify(engineVersion()),
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
})
