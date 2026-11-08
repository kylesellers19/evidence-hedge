// ─────────────────────────────────────────────────────────────────────────────
// node checks/export-academic.mjs — change set 4, Part E input: the three
// open-access academic PDFs GROBID is compared on (GROBID is built for academic
// papers, so it is not run on Fixtures A–C).
//
// Reads checks/data/academic/<id>.pdf as an upload (the app's own PDF path)
// and writes, under checks/data/academic/ (gitignored):
//   units/<id>.jsonl                       sentence units, the app's segmentation
//   engine/<commit>/<id>.links.jsonl       evidence links per extracted claim
//   engine/<commit>/<id>.references.jsonl  the reference list as the app parses it
// The research repo's GROBID adapter maps GROBID's citation callouts onto these
// unit ids by text match and reports agreement.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { DATA, runFixture } from './lib/fixtures.mjs'
import { engineCommit } from './lib/engine-rows.mjs'
import { parseReferences } from '../src/engine/references.js'

// The handoff asks Kyle for three open-access academic PDFs from the
// overreach-study corpus. Two of the corpus documents are academic papers with
// open PDFs (Allen et al. 2016; the JCU timber pilot); the third, Satish et al.
// 2012, is the open-access paper Allen et al. build on. Substitutes until Kyle
// supplies his three.
export const ACADEMIC = [
  { id: 'allen-ehp-2016', label: 'Allen et al. 2016, EHP (PMC4892924, CC0)', pdf: 'checks/data/academic/allen-ehp-2016.pdf' },
  { id: 'jcu-timber-pilot', label: 'JCU timber pilot (researchonline.jcu.edu.au/89901)', pdf: 'checks/data/academic/jcu-timber-pilot.pdf' },
  { id: 'satish-ehp-2012', label: 'Satish et al. 2012, EHP (PMC3548274, CC0)', pdf: 'checks/data/academic/satish-ehp-2012.pdf' },
]

const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n'
const commit = engineCommit()
const OUT = join(DATA, 'academic')
mkdirSync(join(OUT, 'units'), { recursive: true })
mkdirSync(join(OUT, 'engine', commit), { recursive: true })

for (const a of ACADEMIC) {
  if (!existsSync(join(OUT, `${a.id}.pdf`))) { console.log(`SKIP ${a.id} — no PDF`); continue }
  const run = await runFixture({ ...a })
  if (run.status !== 'ok') { console.log(`SKIP ${a.id} — ${run.reason}`); continue }
  writeFileSync(join(OUT, 'units', `${a.id}.jsonl`), jsonl(run.units.map(({ id, page, index, hash, text, section }) => ({ id, fixture: a.id, page, index, hash, text, section }))))
  const rows = []
  let ci = 0
  for (const u of run.units) {
    const c = run.analysis.claims[ci]
    if (!c || c.text !== u.text) continue
    ci++
    rows.push({ unit_id: u.id, claim_id: c.id, engine_commit: commit, label_tier: 'predicted', attribution: c.attribution.label, ...c.evidence })
  }
  writeFileSync(join(OUT, 'engine', commit, `${a.id}.links.jsonl`), jsonl(rows))
  const refs = parseReferences(run.analysis.references.map((r) => r.text))
  writeFileSync(join(OUT, 'engine', commit, `${a.id}.references.jsonl`), jsonl(refs))
  const markers = rows.flatMap((r) => r.links).filter((l) => l.basis === 'marker')
  console.log(`${a.id}: ${run.units.length} units, ${rows.length} claims, ${refs.length} references, ${markers.length} marker links (${markers.filter((l) => l.target.kind === 'reference').length} resolved)`)
}
