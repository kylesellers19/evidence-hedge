// Loads the site's other pages in headless Chromium and fails on any page error or
// console error: run after a deploy (node checks/site-smoke.mjs https://evidencehedge.org).
import { chromium } from 'playwright'
const base = process.argv[2]
const b = await chromium.launch()
let bad = 0
for (const p of ['/', '/list', '/method', '/contact', '/legal', '/conferences']) {
  const page = await b.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  const r = await page.goto(base + p, { waitUntil: 'networkidle' })
  const h = await page.evaluate(() => (document.querySelector('h1')?.textContent || document.title || '').trim().slice(0, 50))
  const nav = await page.$$eval('.eh-nav a', (as) => as.map((a) => a.textContent))
  console.log(r.status(), p, '|', h, '|', nav.join(', '), errs.length ? 'ERRORS ' + errs.join(' | ') : '')
  if (errs.length || r.status() >= 400) bad++
  await page.close()
}
await b.close()
process.exit(bad ? 1 : 0)
