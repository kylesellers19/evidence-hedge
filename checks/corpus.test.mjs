// ─────────────────────────────────────────────────────────────────────────────
// Corpus integrity: every document in fixtures/corpus.json either loads or
// prints SKIP <id> with a reason — never passes silently. Committed text is
// public-domain/CC only (D4), the cache is gitignored, and committed files match
// fixtures/manifest.lock.json.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { ROOT, COMMITTED, loadCorpus, loadDocText } from './lib/corpus.mjs'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

const corpus = loadCorpus()
const ids = new Set(corpus.map((d) => d.id))
log('corpus ids are unique', ids.size === corpus.length)
log('every document has gold rubric, posture, provenance and design',
  corpus.every((d) => d.gold && d.gold.rubric && d.gold.posture && d.gold.provenance && d.gold.design))

let loaded = 0, skipped = 0
for (const doc of corpus) {
  const r = await loadDocText(doc)
  if (r.status === 'ok') loaded++
  else { skipped++; console.log(`SKIP ${doc.id} — ${r.reason}`); if (!r.reason) log(`${doc.id} skip has a reason`, false) }
}
console.log(`${loaded} loaded, ${skipped} skipped`)

// D4: committed corpus text is public-domain / CC only.
const committedFiles = existsSync(COMMITTED) ? readdirSync(COMMITTED) : []
for (const f of committedFiles) {
  const id = f.replace(/\.(raw\.)?txt$/, '')
  const doc = corpus.find((d) => d.id === id)
  log(`fixtures/corpus/${f} is a commit:true document`, !!doc && doc.commit === true)
  if (doc?.commitIf) log(`fixtures/corpus/${f} carries its "${doc.commitIf}" notice`, new RegExp(doc.commitIf, 'i').test(readFileSync(join(COMMITTED, f), 'utf8')))
}
const ignored = (() => { try { return execSync('git check-ignore fixtures/cache/x.txt', { cwd: ROOT }).toString().trim() } catch { return '' } })()
log('fixtures/cache/ is gitignored', ignored === 'fixtures/cache/x.txt')

// Committed raw text matches its lock entry.
const lock = JSON.parse(readFileSync(join(ROOT, 'fixtures', 'manifest.lock.json'), 'utf8'))
for (const f of committedFiles.filter((f) => f.endsWith('.raw.txt'))) {
  const id = f.replace('.raw.txt', '')
  const sha = createHash('sha256').update(readFileSync(join(COMMITTED, f), 'utf8')).digest('hex')
  log(`fixtures/corpus/${f} matches manifest.lock.json`, lock[id]?.sha256 === sha)
}

if (!ok) { console.error('\ncorpus checks failed.'); process.exit(1) }
console.log('\nCorpus checks passed (SKIPs listed above).')
process.exit(0)
