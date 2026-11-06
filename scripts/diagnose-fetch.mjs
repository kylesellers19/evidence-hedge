// ─────────────────────────────────────────────────────────────────────────────
// node scripts/diagnose-fetch.mjs [url …] — run the app's fetchLink in Node and
// print what each stage returns, for links that fail in-app. Defaults to the
// two corpus documents reported failing (naava-allen, gensler-gws-2024).
// Node has no CORS, so the direct-download attempt can succeed here where the
// browser's would be blocked; the reader path is identical.
// ─────────────────────────────────────────────────────────────────────────────

import { fetchLink, READER, CHROME_SELECTOR } from '../src/ingest/fetchLink.js'

const urls = process.argv.slice(2).length ? process.argv.slice(2) : [
  'https://www.naava.io/science/a-controlled-exposure-study-of-green-and-conventional-office-environments',
  'https://www.gensler.com/gri/global-workplace-survey-2024',
]

for (const url of urls) {
  console.log(`\n── ${url}`)
  // 1. What the browser's direct request sees (status, type, CORS header).
  try {
    const res = await fetch(url, { headers: { Origin: 'https://evidencehedge.org' }, signal: AbortSignal.timeout(15000) })
    console.log(`direct: ${res.status} ${res.headers.get('content-type')} · access-control-allow-origin=${res.headers.get('access-control-allow-origin') ?? '(none → browser blocks)'}`)
  } catch (e) { console.log(`direct: ${e.name} ${e.message}`) }
  // 2. The reader, exactly as the app asks.
  const t0 = Date.now()
  try {
    const res = await fetch(READER + encodeURIComponent(url), { headers: { 'X-Return-Format': 'text', 'X-Remove-Selector': CHROME_SELECTOR }, signal: AbortSignal.timeout(60000) })
    const body = await res.text()
    console.log(`reader: ${res.status} in ${Date.now() - t0} ms · ${body.length} chars · ${body.trim().split(/\s+/).length} words`)
  } catch (e) { console.log(`reader: ${e.name} after ${Date.now() - t0} ms`) }
  // 3. The app's own fetchLink, end to end.
  const t1 = Date.now()
  const r = await fetchLink(url)
  console.log(`fetchLink: ${JSON.stringify({ ok: r.ok, reason: r.reason, kind: r.kind, via: r.via, chars: r.text?.length })} in ${Date.now() - t1} ms`)
  if (r.ok) console.log('first 300 chars: ' + JSON.stringify(r.text.slice(0, 300)))
}
