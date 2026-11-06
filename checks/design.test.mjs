// ─────────────────────────────────────────────────────────────────────────────
// Profile and design checks:
//   · provenance and design vs the working gold labels (corpus)
//   · design ceilings follow GRADE start-low
//   · Allen (a double-blind controlled experiment) trips few or no causal-overreach
//   · causal-overreach is DISCLOSURE-INVARIANT: removing a document's
//     limitations / causal-disclaimer paragraphs changes neither the flags on
//     the claims both versions share nor the overreach penalty. Run on HKS
//     (verification #4) when its supplied file is present, and on every
//     available document that disclaims causality.
// Missing documents print SKIP <id>.
// ─────────────────────────────────────────────────────────────────────────────

import { loadCorpus, loadDocText } from './lib/corpus.mjs'
import { profileDocument } from '../src/engine/profile/index.js'
import { DESIGN_CEILINGS } from '../src/engine/profile/design.js'
import { SELF_DISCLAIMER } from '../src/engine/lexicons/design.js'
import { routeDocument } from '../src/rubrics/route.js'
import { analyze } from '../src/engine/analyze.js'
import { getRubric } from '../src/rubrics/index.js'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

// ── GRADE start-low ceilings ─────────────────────────────────────────────────
const want = {
  rct: ['direct-causal', 'strong'], 'controlled-experiment': ['direct-causal', 'strong'],
  'quasi-experimental': ['conditional-causal', 'weak'], 'cohort-longitudinal': ['conditional-causal', 'weak'],
  modeling: ['conditional-causal', 'weak'], 'systematic-review': ['conditional-causal', 'weak'],
}
const ceilingsOk = Object.entries(DESIGN_CEILINGS).every(([d, c]) => {
  const [r, a] = want[d] || ['correlational', 'weak']
  return c.maxRegister === r && c.maxRecommendation === a
})
log('design ceilings follow GRADE start-low (direct/strong · conditional/weak · correlational/weak)', ceilingsOk)

// ── provenance + design vs gold ──────────────────────────────────────────────
const docs = []
for (const doc of loadCorpus()) {
  const loaded = await loadDocText(doc)
  if (loaded.status !== 'ok') { console.log(`SKIP ${doc.id} — ${loaded.reason}`); continue }
  docs.push({ doc, text: loaded.text })
}
const profiled = docs.map(({ doc, text }) => ({ doc, p: profileDocument(text, { sourceUrl: doc.url || '' }) }))
const provHits = profiled.filter(({ doc, p }) => p.provenance.kind === doc.gold.provenance)
const designHits = profiled.filter(({ doc, p }) => p.design.design === doc.gold.design)
for (const { doc, p } of profiled) {
  if (p.provenance.kind !== doc.gold.provenance) console.log(`   provenance ${doc.id}: ${p.provenance.kind} (gold ${doc.gold.provenance})`)
  if (p.design.design !== doc.gold.design) console.log(`   design ${doc.id}: ${p.design.design} (gold ${doc.gold.design})`)
}
export const PROFILE_MIN = 0.8 // PROVISIONAL — not ratified
log(`provenance matches gold on ≥ ${PROFILE_MIN * 100}%`, provHits.length >= PROFILE_MIN * profiled.length, `${provHits.length}/${profiled.length}`)
log(`design matches gold on ≥ ${PROFILE_MIN * 100}%`, designHits.length >= PROFILE_MIN * profiled.length, `${designHits.length}/${profiled.length}`)
const inheritedOk = profiled.filter(({ doc }) => doc.gold.designInherited).every(({ p }) => p.design.inherited)
log('derivative documents inherit the design they describe', inheritedOk)

// ── Allen: few or no causal-overreach ────────────────────────────────────────
export const ALLEN_OVERREACH_MAX = 2 // PROVISIONAL — "few or no"
const allen = docs.find(({ doc }) => doc.id === 'allen-ehp-2016')
if (allen) {
  const r = routeDocument(allen.text, { sourceUrl: allen.doc.url })
  const n = analyze(allen.text, getRubric(r.rubric), r.posture, { sourceUrl: allen.doc.url }).summary.flagCounts['causal-overreach']
  log(`allen-ehp-2016: ≤ ${ALLEN_OVERREACH_MAX} causal-overreach flags`, n <= ALLEN_OVERREACH_MAX, `${n}`)
} else console.log('SKIP allen-ehp-2016')

// ── disclosure invariance ────────────────────────────────────────────────────
const DISCLOSURE = [/\blimitations?\b/i, ...SELF_DISCLAIMER.map((s) => new RegExp(s, 'i'))]
// Remove the limitations paragraph when the document has one of its own; in
// run-on text (PDF reader output), remove the disclosure sentences instead.
function withoutDisclosure(text) {
  const paras = text.split(/\n\n+/)
  const kept = paras.filter((p) => !DISCLOSURE.some((re) => re.test(p)))
  const removedChars = text.length - kept.join('\n\n').length
  if (kept.length < paras.length && removedChars < text.length * 0.2) {
    return { text: kept.join('\n\n'), removed: paras.length - kept.length, unit: 'paragraph' }
  }
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"“(])/)
  const keptS = sentences.filter((s) => !DISCLOSURE.some((re) => re.test(s)))
  return { text: keptS.join(' '), removed: sentences.length - keptS.length, unit: 'sentence' }
}
function overreachView(text, doc) {
  const r = routeDocument(text, { sourceUrl: doc.url || '' })
  const a = analyze(text, getRubric(r.rubric), r.posture, { sourceUrl: doc.url || '' })
  return {
    flags: new Map(a.claims.map((c) => [c.text, c.overreach ? c.overreach.distance : 0])),
    penalty: a.documentScore.breakdown.overreachPenalty ?? null,
  }
}
const targets = docs.filter(({ doc, text }) => doc.id === 'hks-human-potential' || DISCLOSURE.slice(1).some((re) => re.test(text)))
if (!docs.some(({ doc }) => doc.id === 'hks-human-potential')) console.log('SKIP hks-human-potential — disclosure invariance runs on the available disclaiming documents instead')
for (const { doc, text } of targets) {
  const stripped = withoutDisclosure(text)
  if (!stripped.removed) { console.log(`SKIP ${doc.id} — no separable limitations paragraph`); continue }
  const a = overreachView(text, doc)
  const b = overreachView(stripped.text, doc)
  const shared = [...b.flags.keys()].filter((t) => a.flags.has(t))
  const changed = shared.filter((t) => a.flags.get(t) !== b.flags.get(t))
  log(`${doc.id}: causal-overreach identical on ${shared.length} shared claims with and without ${stripped.removed} disclosure ${stripped.unit}(s)`,
    shared.length > 0 && changed.length === 0, changed[0]?.slice(0, 80))
  if (a.penalty !== null) log(`${doc.id}: overreach penalty identical (${a.penalty} vs ${b.penalty})`, a.penalty === b.penalty)
}

if (!ok) { console.error('\ndesign checks failed.'); process.exit(1) }
console.log('\nDesign checks passed.')
process.exit(0)
