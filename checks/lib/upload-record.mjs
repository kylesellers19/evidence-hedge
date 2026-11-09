// ─────────────────────────────────────────────────────────────────────────────
// What a reader's upload of a PDF gives, as hashes: the file, each page's text,
// the document text, and the claim count. Fixture text stays out of the public
// repo, so only hashes are recorded.
//
// One module for both builds of pdf.js. Node (checks/pdf-upload.test.mjs) runs
// it on readPdfPages, the legacy build; the browser runs it on the app's own
// extractPdf, the browser build. To record in the browser: npm run dev, open
// http://localhost:5174, and in the page's console, with the engine commit
// (git log -1 --format=%h -- src):
//   const m = await import('/checks/lib/upload-record.mjs')
//   copy(JSON.stringify(await m.recordInBrowser('<engine commit>'), null, 1) + '\n')
// then paste over checks/targets/pdf-upload.json.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeDocument } from '../../src/ingest/normalizer.js'
import { routeDocument } from '../../src/rubrics/route.js'
import { analyze } from '../../src/engine/analyze.js'

export const sha12 = async (data) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
}

// An upload has no link, so analyze() gets none.
export async function uploadRecord(pdf, bytes, pages) {
  const text = normalizeDocument(pages)
  const route = routeDocument(text, { sourceUrl: '' })
  const analysis = analyze(text, route.judgment.rubric, route.posture, { sourceUrl: '' })
  return { pdf, file: await sha12(bytes), claims: analysis.claims.length, text: await sha12(text), pages: await Promise.all(pages.map((p) => sha12(p))) }
}

// Browser only: re-record every document in the target whose PDF the dev
// server serves, through extractPdf as the app runs it.
export async function recordInBrowser(engineCommit) {
  const { extractPdf } = await import('../../src/ingest/extractPdf.js')
  const prior = await (await fetch('/checks/targets/pdf-upload.json')).json()
  const documents = {}
  for (const [id, d] of Object.entries(prior.documents)) {
    const res = await fetch(`/${d.pdf}`)
    if (!res.ok) { documents[id] = d; continue }
    const bytes = new Uint8Array(await res.arrayBuffer())
    const pages = await extractPdf(new File([bytes], d.pdf.split('/').pop(), { type: 'application/pdf' }))
    documents[id] = await uploadRecord(d.pdf, bytes, pages)
  }
  return { ...prior, recorded: new Date().toISOString().slice(0, 10), engine_commit: engineCommit, recorded_in: `browser: extractPdf on the dev server, ${navigator.userAgent}`, documents }
}
