import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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

// GitHub Pages serves files, not routes. Each page gets a copy of the app
// shell at <page>/index.html, so /list, /method, /contact and /legal load directly
// (with a 200), and 404.html boots the app for any other path.
const release = JSON.parse(readFileSync(new URL('./src/conferences/release.json', import.meta.url), 'utf8'))
const conferenceData = JSON.parse(readFileSync(new URL(`./public/${release.path}`, import.meta.url), 'utf8'))
const conferencePages = conferenceData.sessions.map(({ id }) => {
  if (!/^[A-Z0-9-]+$/.test(id)) throw new Error('Invalid conference route ID')
  return `conferences/${id}`
})
const PAGES = ['list', 'method', 'contact', 'legal', 'conferences', 'conferences/catalogue', 'conferences/access', 'conferences/method', ...conferencePages]
function pageShells() {
  return {
    name: 'page-shells',
    apply: 'build',
    closeBundle() {
      const out = 'dist'
      for (const page of PAGES) {
        mkdirSync(join(out, page), { recursive: true })
        copyFileSync(join(out, 'index.html'), join(out, page, 'index.html'))
      }
      copyFileSync(join(out, 'index.html'), join(out, '404.html'))
    },
  }
}

// base is the domain root: the site is served at https://evidencehedge.org/.
export default defineConfig({
  base: '/',
  plugins: [react(), pageShells()],
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
