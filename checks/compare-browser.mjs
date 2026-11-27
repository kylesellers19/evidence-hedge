// Compare firms in a real browser (Playwright 1.63, headless Chromium).
//
//   node checks/compare-browser.mjs <base-url> <out-dir> [--live]
//   e.g. node checks/compare-browser.mjs http://localhost:4186 docs/compare/screens/abc1234
//
// Until The List's table has the version 3 flag counts, the page's requests to
// it are answered with the committed snapshot of real List rows
// (checks/lib/compare-mock.mjs); with --live it reads the table itself.
//
// At 1440, 1024, 768 and 390 px: screenshots of the panels and of a four-firm
// comparison, and the page fails on console errors, failed requests, sideways
// scroll, clipped or overlapping text, wrapped numbers, or serious or critical
// axe-core violations. At 1440 and 390 it also completes the three panels by
// keyboard alone (the combobox, a chip removed by keyboard, visible focus),
// presses Compare and checks focus lands on the results heading, opens the
// shared address in a fresh page and gets the same results, and checks Back
// brings the panels back. Writes <out-dir>/checks.json; exits non-zero on any
// failure.
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { routeList } from './lib/compare-mock.mjs'

const require = createRequire(import.meta.url)
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const args = process.argv.slice(2)
const LIVE = args.includes('--live')
const [base = 'http://localhost:4186', outDir = 'docs/compare/screens/local'] = args.filter((a) => !a.startsWith('--'))
const WIDTHS = [1440, 1024, 768, 390]
const RESULTS = '/list/compare?firm=Arup+US&vs=Mortenson&vs=WSP&vs=JE+Dunn+Construction&types=research-report,survey-report,white-paper,industry-or-market-report,press-release,news-article,opinion-or-commentary,marketing-material,other'
mkdirSync(outDir, { recursive: true })

const failures = []
const report = { base, live: LIVE, runs: [], interactions: [] }
const fail = (where, what) => failures.push(`${where}: ${what}`)

function layoutProbe() {
  const root = document.querySelector('main.eh-compare')
  const out = { clipped: [], wrappedNumbers: [], overlaps: [], sideways: 0 }
  out.sideways = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (!root) return out
  const visible = (el) => {
    const s = getComputedStyle(el)
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false
    if (el.closest('.eh-sr-only')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  // Inside a scrolling list, only what shows in its window counts.
  const shown = (el) => {
    const list = el.closest('.cmp-options')
    if (!list) return true
    const r = el.getBoundingClientRect(), w = list.getBoundingClientRect()
    return r.top >= w.top - 1 && r.bottom <= w.bottom + 1
  }
  const leaf = [...root.querySelectorAll('h1,h2,h3,p,th,td,label,button,span,li,a,legend,strong')]
    .filter((el) => visible(el) && shown(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
  const box = root.getBoundingClientRect()
  for (const el of leaf) {
    const s = getComputedStyle(el)
    if ((s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1) out.clipped.push(el.textContent.trim().slice(0, 60))
    const r = el.getBoundingClientRect()
    const scroller = el.closest('.eh-table-scroll, .cmp-options')
    if (!scroller && r.right > box.right + 1) out.clipped.push(`past the page: ${el.textContent.trim().slice(0, 60)}`)
  }
  for (const el of root.querySelectorAll('.cmp-num, .cmp-n, .cmp-option-n, td.n, .cmp-types td')) {
    if (!visible(el)) continue
    const range = document.createRange()
    range.selectNodeContents(el)
    const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))
    if (lines.size > 1) out.wrappedNumbers.push(el.textContent.trim().slice(0, 40))
  }
  const rects = leaf.map((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    return { el, rs: [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1) }
  })
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j]
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue
      for (const ra of a.rs) for (const rb of b.rs) {
        const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
        const y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
        if (x > 2 && y > 2) out.overlaps.push(`${a.el.textContent.trim().slice(0, 30)} / ${b.el.textContent.trim().slice(0, 30)}`)
      }
    }
  }
  return out
}

async function newPage(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const errors = [], failed = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })
  if (!LIVE) await routeList(page)
  return { ctx, page, errors, failed }
}
const waitResults = (page) => page.waitForSelector('.cmp-results h2#cmp-lead', { timeout: 60000 })
const waitPanels = (page) => page.waitForSelector('.cmp-panels', { timeout: 30000 })

async function axe(page) {
  await page.addScriptTag({ content: AXE })
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] })
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
  })
}

async function inspect(page, where, shot) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: shot, fullPage: true })
  const probe = await page.evaluate(layoutProbe)
  const violations = await axe(page)
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  if (probe.sideways > 0) fail(where, `page scrolls sideways by ${probe.sideways}px`)
  if (probe.clipped.length) fail(where, `clipped text: ${probe.clipped.slice(0, 5).join(' | ')}`)
  if (probe.wrappedNumbers.length) fail(where, `wrapped numbers: ${probe.wrappedNumbers.slice(0, 5).join(' | ')}`)
  if (probe.overlaps.length) fail(where, `overlapping text: ${probe.overlaps.slice(0, 5).join(' | ')}`)
  if (bad.length) fail(where, `axe: ${bad.map((v) => `${v.id} (${v.impact}, ${v.nodes}) ${v.targets.join(', ')}`).join(' | ')}`)
  return { probe: { ...probe, overlaps: probe.overlaps.length }, axe: violations }
}

// Tab (or Shift-Tab) until the focused element matches; returns what was passed.
async function tabTo(page, test, { back = false, max = 60 } = {}) {
  const seen = []
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab')
    const f = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const s = getComputedStyle(el)
      return { tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', type: el.getAttribute('type') || '', label: (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 60),
        outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, inCompare: !!el.closest('main.eh-compare') }
    })
    if (f) seen.push(f)
    if (f && test(f)) return { found: f, seen }
  }
  return { found: null, seen }
}

const browser = await chromium.launch()
try {
  for (const width of WIDTHS) {
    // The panels, empty.
    {
      const { ctx, page, errors, failed } = await newPage(browser, width)
      await page.goto(`${base}/list/compare`, { waitUntil: 'networkidle' })
      await waitPanels(page)
      const r = await inspect(page, `${width} panels`, join(outDir, `compare-${width}-panels.png`))
      if (errors.length) fail(`${width} panels`, `console errors: ${errors.join(' | ')}`)
      if (failed.length) fail(`${width} panels`, `failed requests: ${failed.join(' | ')}`)
      report.runs.push({ width, view: 'panels', errors, failed, ...r })
      await ctx.close()
    }
    // A four-firm comparison, from its address.
    {
      const { ctx, page, errors, failed } = await newPage(browser, width)
      const t0 = Date.now()
      await page.goto(`${base}${RESULTS}`, { waitUntil: 'networkidle' })
      await waitResults(page)
      const ms = Date.now() - t0
      const r = await inspect(page, `${width} results`, join(outDir, `compare-${width}-results.png`))
      if (errors.length) fail(`${width} results`, `console errors: ${errors.join(' | ')}`)
      if (failed.length) fail(`${width} results`, `failed requests: ${failed.join(' | ')}`)
      report.runs.push({ width, view: 'results', ms, errors, failed, ...r })
      await ctx.close()
    }
    if (width !== 1440 && width !== 390) continue

    // The three panels by keyboard alone, then Compare, the shared address and Back.
    const { ctx, page, errors } = await newPage(browser, width)
    const steps = []
    const step = (name, ok, note = '') => steps.push({ step: name, ok: Boolean(ok), note })
    await page.goto(`${base}/list/compare`, { waitUntil: 'networkidle' })
    await waitPanels(page)
    let t = await tabTo(page, (f) => f.role === 'combobox')
    step('tab reaches the firm search', t.found)
    await page.keyboard.type('morten')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')
    await page.waitForSelector('.cmp-picked')
    step('Enter picks the firm and the address holds it', page.url().includes('firm=Mortenson'))
    const focusAfterPick = await page.evaluate(() => document.activeElement?.getAttribute('role'))
    step('focus moves to the second panel’s search', focusAfterPick === 'combobox')
    await page.keyboard.type('smithgroup')
    await page.keyboard.press('Enter')
    await page.keyboard.type('wsp')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelectorAll('.cmp-chip').length === 2)
    step('two firms picked as chips, in order', (await page.$$eval('.cmp-chip', (c) => c.map((x) => x.getAttribute('aria-label')))).join() === 'Remove SmithGroup,Remove WSP')
    t = await tabTo(page, (f) => f.label === 'Remove WSP', { back: true, max: 12 })
    step('Shift-Tab reaches the WSP chip', t.found)
    await page.keyboard.press('Delete')
    await page.waitForFunction(() => document.querySelectorAll('.cmp-chip').length === 1)
    step('Delete removes the chip and the address drops it', !page.url().includes('vs=WSP') && page.url().includes('vs=SmithGroup'))
    t = await tabTo(page, (f) => f.type === 'checkbox' && f.label !== '' && f.inCompare && !/readers/i.test(f.label))
    step('tab reaches the report types', t.found)
    const before = await page.$$eval('.cmp-types input:checked', (x) => x.length)
    await page.keyboard.press('Space')
    const toggled = await page.$$eval('.cmp-types input:checked', (x) => x.length)
    await page.keyboard.press('Space')
    step('Space ticks and unticks a type', toggled !== before && before > 0)
    t = await tabTo(page, (f) => f.tag === 'button' && f.label === 'Compare')
    step('tab reaches Compare', t.found)
    const passed = [...t.seen]
    step('every control reached shows focus', passed.filter((x) => x.inCompare).every((x) => x.outline), passed.filter((x) => x.inCompare && !x.outline).map((x) => x.label).join(' | '))
    await page.keyboard.press('Enter')
    await waitResults(page)
    await page.waitForFunction(() => document.activeElement?.id === 'cmp-lead', null, { timeout: 10000 }).catch(() => {})
    step('Compare moves focus to the results heading', await page.evaluate(() => document.activeElement?.id === 'cmp-lead'))
    const shared = page.url()
    const textHere = await page.$eval('.cmp-results', (el) => [el.querySelector('#cmp-lead').textContent, ...[...el.querySelectorAll('.cmp-text p')].map((p) => p.textContent)].join('\n'))
    const other = await newPage(browser, width)
    await other.page.goto(shared, { waitUntil: 'networkidle' })
    await waitResults(other.page)
    const textThere = await other.page.$eval('.cmp-results', (el) => [el.querySelector('#cmp-lead').textContent, ...[...el.querySelectorAll('.cmp-text p')].map((p) => p.textContent)].join('\n'))
    step('the shared address opens on the same results', textHere === textThere && !(await other.page.$('.cmp-panels')))
    await other.ctx.close()
    await page.goBack()
    await waitPanels(page).catch(() => {})
    step('Back brings the panels back, with the firms', Boolean(await page.$('.cmp-panels')) && (await page.$$('.cmp-chip')).length === 1)
    if (errors.length) step('no console errors along the way', false, errors.join(' | '))
    for (const s of steps) if (!s.ok) fail(`${width} keyboard`, `${s.step}${s.note ? ` (${s.note})` : ''}`)
    report.interactions.push({ width, steps })
    await ctx.close()
  }
} finally {
  await browser.close()
}
report.failures = failures
writeFileSync(join(outDir, 'checks.json'), JSON.stringify(report, null, 1) + '\n')
if (failures.length) {
  console.error(`FAIL ${failures.length}:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`ok: ${report.runs.length} views, ${report.interactions.length} keyboard runs, screenshots in ${outDir}`)
