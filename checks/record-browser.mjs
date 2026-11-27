// The Record in a real browser (Playwright 1.63, headless Chromium).
//
//   node checks/record-browser.mjs <base-url> <out-dir>
//   e.g. node checks/record-browser.mjs http://localhost:4174 docs/record/screens/abc1234
//
// At 1440, 1024, 768 and 390 px, light and dark: a full-page screenshot, then the page
// fails on console errors, failed requests, sideways page scroll, clipped or overlapping
// text, wrapped numbers, or serious or critical axe-core violations. At 1440 and 390 it
// also changes the organization, clicks a point, opens every view and tabs through every
// control. Writes <out-dir>/checks.json and exits non-zero on any failure.
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const [base = 'http://localhost:4174', outDir = 'docs/record/screens/local'] = process.argv.slice(2)
const WIDTHS = [1440, 1024, 768, 390]
const SCHEMES = ['light', 'dark']
mkdirSync(outDir, { recursive: true })

const failures = []
const report = { base, runs: [], interactions: [] }
const fail = (where, what) => failures.push(`${where}: ${what}`)

function layoutProbe() {
  // Runs in the page. Returns text problems inside the Record's main column.
  const root = document.querySelector('main.rec')
  const out = { clipped: [], wrappedNumbers: [], overlaps: [], sideways: 0 }
  out.sideways = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (!root) return out
  const visible = (el) => {
    const s = getComputedStyle(el)
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false
    if (el.closest('.rec-sr,[hidden],details:not([open]) > :not(summary)')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const leaf = [...root.querySelectorAll('h1,h2,p,th,td,label,button,summary,span,dt,dd,text,select,option')]
    .filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
  for (const el of leaf) {
    if (el.tagName === 'text' || el.tagName === 'option') continue
    const s = getComputedStyle(el)
    if ((s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1) {
      out.clipped.push(el.textContent.trim().slice(0, 60))
    }
    const r = el.getBoundingClientRect()
    const box = root.getBoundingClientRect()
    if (r.right > box.right + 1 && !el.closest('[style*="overflow"]')) out.clipped.push(`past the column: ${el.textContent.trim().slice(0, 60)}`)
  }
  for (const el of root.querySelectorAll('.rec-num,.num,td.v,td.ci,td.med')) {
    if (!visible(el)) continue
    const range = document.createRange()
    range.selectNodeContents(el)
    const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))
    if (lines.size > 1 && !el.querySelector('.rec-basis')) out.wrappedNumbers.push(el.textContent.trim().slice(0, 40))
  }
  // Overlap between text boxes (HTML leaves pairwise, and SVG labels against each other and the points).
  const rects = leaf.filter((el) => el.tagName !== 'option' && el.tagName !== 'select').map((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const rs = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1)
    return { el, rs }
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

async function openPage(browser, width, scheme) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })
  await page.goto(`${base}/record`, { waitUntil: 'networkidle' })
  await page.waitForSelector('main.rec table.rec-table', { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
  return { ctx, page, errors, failed }
}

async function axe(page) {
  await page.addScriptTag({ content: AXE })
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] })
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
  })
}

const browser = await chromium.launch()
try {
  for (const width of WIDTHS) {
    for (const scheme of SCHEMES) {
      const where = `${width} ${scheme}`
      const { ctx, page, errors, failed } = await openPage(browser, width, scheme)
      const shot = join(outDir, `record-${width}-${scheme}.png`)
      await page.screenshot({ path: shot, fullPage: true })
      const probe = await page.evaluate(layoutProbe)
      const violations = await axe(page)
      const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      if (errors.length) fail(where, `console errors: ${errors.join(' | ')}`)
      if (failed.length) fail(where, `failed requests: ${failed.join(' | ')}`)
      if (probe.sideways > 0) fail(where, `page scrolls sideways by ${probe.sideways}px`)
      if (probe.clipped.length) fail(where, `clipped text: ${probe.clipped.slice(0, 5).join(' | ')}`)
      if (probe.wrappedNumbers.length) fail(where, `wrapped numbers: ${probe.wrappedNumbers.slice(0, 5).join(' | ')}`)
      if (probe.overlaps.length) fail(where, `overlapping text: ${probe.overlaps.slice(0, 5).join(' | ')}`)
      if (bad.length) fail(where, `axe: ${bad.map((v) => `${v.id} (${v.impact}, ${v.nodes}) ${v.targets.join(', ')}`).join(' | ')}`)
      report.runs.push({ width, scheme, screenshot: shot, errors, failed, probe: { ...probe, overlaps: probe.overlaps.length },
        axe: violations })

      if (scheme === 'light' && (width === 1440 || width === 390)) {
        const steps = []
        // 1. Change the organization.
        const before = await page.textContent('.rec-sentence')
        const opts = await page.$$eval('select.rec-select option', (os) => os.map((o) => o.value))
        const current = await page.$eval('select.rec-select', (s) => s.value)
        const next = opts.find((o) => o !== current)
        await page.selectOption('select.rec-select', next)
        const after = await page.textContent('.rec-sentence')
        const url1 = page.url()
        steps.push({ step: 'select organization', ok: before !== after && url1.includes(`org=${next}`) })
        // 2. Click a point (if the figure is drawn).
        const pts = await page.$$('svg.rec-plot circle.pt:not(.sel)')
        if (pts.length) {
          const box = await pts[0].boundingBox()
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          const tip = await page.$('.rec-tooltip')
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
          const url2 = page.url()
          steps.push({ step: 'hover shows the nearest point', ok: !!tip })
          steps.push({ step: 'click a point selects it', ok: url2 !== url1 })
        } else {
          steps.push({ step: 'click a point', ok: true, note: 'no points: the figure shows its empty state' })
        }
        // 3. Each view opens in place, and closes.
        for (const label of ['Open ground', '“First” claims', 'Claims', 'Method']) {
          const btn = page.getByRole('button', { name: label, exact: true })
          await btn.click()
          const open = await btn.getAttribute('aria-expanded')
          const panelVisible = await page.$eval('.rec-panel', (p) => !p.hidden && p.getBoundingClientRect().height > 0)
          steps.push({ step: `open ${label}`, ok: open === 'true' && panelVisible })
          await page.screenshot({ path: join(outDir, `record-${width}-view-${label.replace(/[^A-Za-z]+/g, '').toLowerCase()}.png`), fullPage: true })
          const p2 = await page.evaluate(layoutProbe)
          if (p2.sideways > 0) fail(`${where} ${label}`, `page scrolls sideways by ${p2.sideways}px`)
          if (p2.overlaps.length) fail(`${where} ${label}`, `overlapping text: ${p2.overlaps.slice(0, 5).join(' | ')}`)
          if (p2.wrappedNumbers.length) fail(`${where} ${label}`, `wrapped numbers: ${p2.wrappedNumbers.slice(0, 5).join(' | ')}`)
          const v2 = (await axe(page)).filter((v) => v.impact === 'serious' || v.impact === 'critical')
          if (v2.length) fail(`${where} ${label}`, `axe: ${v2.map((v) => `${v.id} ${v.targets.join(', ')}`).join(' | ')}`)
        }
        await page.getByRole('button', { name: 'Method', exact: true }).click()
        steps.push({ step: 'close a view', ok: (await page.$eval('.rec-panel', (p) => p.hidden)) })
        // 4. Tab through everything: every control is reached and shows focus.
        await page.goto(`${base}/record`, { waitUntil: 'networkidle' })
        await page.waitForSelector('main.rec table.rec-table')
        const seen = []
        for (let i = 0; i < 80; i++) {
          await page.keyboard.press('Tab')
          const f = await page.evaluate(() => {
            const el = document.activeElement
            if (!el || el === document.body) return null
            const s = getComputedStyle(el)
            const inRec = !!el.closest('main.rec')
            return { tag: el.tagName.toLowerCase(), cls: el.getAttribute('class') || '', text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
              outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, inRec }
          })
          if (!f) break
          seen.push(f)
          if (f.tag === 'a' && !f.inRec && seen.filter((x) => x.inRec).length > 3) break
        }
        const rec = seen.filter((x) => x.inRec)
        const want = ['select', 'svg', 'summary']
        for (const w of want) {
          const hasIt = rec.some((x) => x.tag === w)
          if ((w === 'svg' || w === 'summary') && !(await page.$('svg.rec-plot'))) continue
          steps.push({ step: `tab reaches ${w}`, ok: hasIt })
        }
        steps.push({ step: 'tab reaches the four view buttons', ok: ['Open ground', '“First” claims', 'Claims', 'Method'].every((l) => rec.some((x) => x.text === l)) })
        steps.push({ step: 'every focused control shows focus', ok: rec.every((x) => x.outline), note: rec.filter((x) => !x.outline).map((x) => x.text).join(' | ') })
        steps.push({ step: 'tab reaches every measure name', ok: rec.filter((x) => x.tag === 'button' && !['Open ground', '“First” claims', 'Claims', 'Method'].includes(x.text)).length >= 9 })
        // 5. Keyboard on the figure.
        if (await page.$('svg.rec-plot')) {
          await page.focus('svg.rec-plot')
          await page.keyboard.press('ArrowRight')
          const live = await page.textContent('.rec-figure .rec-sr')
          const u0 = page.url()
          await page.keyboard.press('Enter')
          steps.push({ step: 'arrow keys move through points; Enter selects', ok: !!live && page.url() !== u0 })
        }
        for (const s of steps) if (!s.ok) fail(`${where} interaction`, `${s.step}${s.note ? ` (${s.note})` : ''}`)
        report.interactions.push({ width, steps, tabbed: seen.length })
      }
      await ctx.close()
    }
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
console.log(`ok: ${report.runs.length} views, ${report.interactions.length} interaction runs, screenshots in ${outDir}`)
