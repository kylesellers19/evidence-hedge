// ─────────────────────────────────────────────────────────────────────────────
// Rubric invariance — measurement must not depend on the rubric.
//
// For every available corpus document (and the regression fixture), analyze
// under all four rubrics and require IDENTICAL, claim for claim:
//   text · tier (certainty) · function · causal register · recommendation
//   strength — and the same analysis.references.
// Listed exception: the journalism rubric keeps title-case headings it would
// otherwise demote (headlines are claims in journalism); journalism may hold
// extra claims, each of which must be such a heading.
// Missing corpus files print SKIP <id>.
// ─────────────────────────────────────────────────────────────────────────────

import { loadCorpus, loadDocText } from './lib/corpus.mjs'
import { analyze } from '../src/engine/analyze.js'
import { getRubric, RUBRIC_ORDER } from '../src/rubrics/index.js'
import { classifyNonClaim } from '../src/engine/nonClaimFilter.js'
import { validateText } from '../src/ingest/validateText.js'

// The regression-baseline fixture (checks/regression-baseline.mjs).
const FIXTURE =
  'Our platform is the #1 best-in-class solution and is unmatched in the industry. ' +
  'Our internal data proves customers always see world-class results. ' +
  'An independent survey by Gartner found adoption grew year over year.'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

const key = (c) => [c.text, c.tier.key, c.function, c.register.register, c.recommendation.strength].join(' ¦ ')

function compare(id, text) {
  const runs = Object.fromEntries(RUBRIC_ORDER.map((r) => [r, analyze(text, getRubric(r))]))
  const ref = runs.research.claims.map(key)
  const problems = []
  for (const r of RUBRIC_ORDER) {
    let got = runs[r].claims
    if (r === 'journalism') {
      const extra = got.filter((c) => classifyNonClaim(c.text, 'research').rule === 'title-heading' && !runs.research.claims.some((x) => x.text === c.text))
      got = got.filter((c) => !extra.includes(c))
    }
    const keys = got.map(key)
    if (keys.length !== ref.length) problems.push(`${r}: ${keys.length} claims vs research ${ref.length}`)
    else {
      const i = keys.findIndex((k, j) => k !== ref[j])
      if (i >= 0) problems.push(`${r} claim ${i}: "${keys[i].slice(0, 120)}" vs "${ref[i].slice(0, 120)}"`)
    }
    if (JSON.stringify(runs[r].references) !== JSON.stringify(runs.research.references)) problems.push(`${r}: references differ`)
  }
  log(`${id}: ${ref.length} claims identical across ${RUBRIC_ORDER.length} rubrics`, problems.length === 0, problems.slice(0, 2).join(' | '))
}

compare('regression-fixture', FIXTURE)
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  if (!validateText(loaded.text).ok) { console.log(`SKIP ${doc.id} — not a document (validateText)`); continue }
  compare(doc.id, loaded.text)
}

if (!ok) { console.error('\nrubric invariance FAILED.'); process.exit(1) }
console.log('\nRubric invariance holds.')
process.exit(0)
