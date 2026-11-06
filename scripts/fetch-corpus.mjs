// ─────────────────────────────────────────────────────────────────────────────
// npm run fixtures:fetch — fill fixtures/cache/ from fixtures/corpus.json.
//
//   reader     fetched through r.jina.ai with the app's own headers and chrome
//              selector (src/ingest/fetchLink.js); the raw body is cached and
//              <id>.txt holds the app's reader-pipeline output
//   pdf        downloaded, then read with the app's PDF extractor (as an upload)
//   supplied   a file Kyle places at fixtures/cache/<id>.txt or <id>.pdf
//   committed  text already tracked in the repo
//
// Writes fixtures/manifest.lock.json (sha256, chars, retrieved-at per doc).
// Documents with commit:true whose text matches commitIf are copied to
// fixtures/corpus/ (tracked); everything else stays in the gitignored cache.
// Cached files are reused; pass --refresh to refetch. Missing → SKIP <id>.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { READER, CHROME_SELECTOR } from '../src/ingest/fetchLink.js'
import { ROOT, CACHE, COMMITTED, loadCorpus, loadDocText, extractPdfFile } from '../checks/lib/corpus.mjs'

const REFRESH = process.argv.includes('--refresh')
const READER_GAP_MS = 3500 // reader free tier: 20 requests a minute
const MANIFEST = join(ROOT, 'fixtures', 'manifest.lock.json')

mkdirSync(CACHE, { recursive: true })
mkdirSync(COMMITTED, { recursive: true })
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchReader(url) {
  const res = await fetch(READER + encodeURIComponent(url), {
    headers: { 'X-Return-Format': 'text', 'X-Remove-Selector': CHROME_SELECTOR },
    signal: AbortSignal.timeout(60000),
  })
  const body = await res.text()
  return { status: res.status, body }
}

let readerCalls = 0
const lines = []
for (const doc of loadCorpus()) {
  const rawPath = join(CACHE, `${doc.id}.raw.txt`)
  const txtPath = join(CACHE, `${doc.id}.txt`)
  const pdfPath = join(CACHE, `${doc.id}.pdf`)
  try {
    if (doc.source === 'reader' && (REFRESH || !existsSync(rawPath))) {
      if (readerCalls++) await sleep(READER_GAP_MS)
      const { status, body } = await fetchReader(doc.url)
      if (status >= 400 || !body.trim()) { lines.push(`SKIP ${doc.id} — reader status ${status}`); continue }
      writeFileSync(rawPath, body)
      manifest[doc.id] = { source: doc.source, url: doc.url, sha256: sha256(body), rawChars: body.length, retrievedAt: new Date().toISOString() }
    }
    if (doc.source === 'pdf' && (REFRESH || !existsSync(pdfPath))) {
      const res = await fetch(doc.url, { signal: AbortSignal.timeout(60000) })
      if (!res.ok) { lines.push(`SKIP ${doc.id} — download status ${res.status}`); continue }
      const buf = Buffer.from(await res.arrayBuffer())
      writeFileSync(pdfPath, buf)
      manifest[doc.id] = { source: doc.source, url: doc.url, sha256: sha256(buf), bytes: buf.length, retrievedAt: new Date().toISOString() }
    }
    // PDFs (downloaded or supplied) → the app's extractor → <id>.txt.
    if ((doc.source === 'pdf' || doc.source === 'supplied') && existsSync(pdfPath)) {
      writeFileSync(txtPath, await extractPdfFile(pdfPath))
      if (doc.source === 'supplied') {
        manifest[doc.id] = { source: doc.source, sha256: sha256(readFileSync(pdfPath)), suppliedAs: 'pdf', retrievedAt: manifest[doc.id]?.retrievedAt || new Date().toISOString() }
      }
    } else if (doc.source === 'supplied' && existsSync(txtPath) && !manifest[doc.id]) {
      manifest[doc.id] = { source: doc.source, sha256: sha256(readFileSync(txtPath)), suppliedAs: 'txt', retrievedAt: new Date().toISOString() }
    }

    const loaded = await loadDocText(doc)
    if (loaded.status !== 'ok') { lines.push(`SKIP ${doc.id} — ${loaded.reason}`); continue }
    if (doc.source === 'reader') writeFileSync(txtPath, loaded.text)
    if (manifest[doc.id]) manifest[doc.id].chars = loaded.text.length
    else manifest[doc.id] = { source: doc.source, path: doc.path, sha256: sha256(loaded.text), chars: loaded.text.length }

    // D4: commit full text only for public-domain / CC documents whose notice is present.
    let committed = ''
    if (doc.commit && doc.source !== 'committed') {
      const ok = !doc.commitIf || new RegExp(doc.commitIf, 'i').test(loaded.text)
      if (ok && existsSync(rawPath)) { copyFileSync(rawPath, join(COMMITTED, `${doc.id}.raw.txt`)); committed = ' (committed: notice present)' }
      else if (ok && existsSync(txtPath)) { copyFileSync(txtPath, join(COMMITTED, `${doc.id}.txt`)); committed = ' (committed)' }
      else committed = ` (NOT committed: "${doc.commitIf}" notice absent)`
    }
    const chrome = loaded.chromeDropped ? ` · ${loaded.chromeDropped.length} chrome lines dropped` : ''
    lines.push(`OK   ${doc.id} — ${loaded.text.length} chars via ${loaded.via}${chrome}${committed}`)
  } catch (e) {
    lines.push(`SKIP ${doc.id} — ${e.name}: ${e.message}`)
  }
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
for (const l of lines) console.log(l)
const skips = lines.filter((l) => l.startsWith('SKIP')).length
console.log(`\n${lines.length - skips} available, ${skips} skipped. Manifest: fixtures/manifest.lock.json`)
