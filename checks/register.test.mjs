// ─────────────────────────────────────────────────────────────────────────────
// Causal register, advice strength and certainty — predicate checks on
// one-sentence corpus excerpts (tagged with their corpus id), plus the held-out
// Yu-corpus metrics when the cached corpus is present (SKIP otherwise).
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { CACHE, ROOT } from './lib/corpus.mjs'
import { causalRegister } from '../src/engine/measure/causalRegister.js'
import { recommendationStrength } from '../src/engine/measure/recommendation.js'
import { measureCertainty } from '../src/engine/measure/certainty.js'

let ok = true
const log = (label, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`) }

const REGISTER = [
  ['gba-news-2015', 'Stale air in offices can lower cognitive function by half, researchers said, suggesting fresh air is one key to improved productivity among workers.', 'conditional-causal'],
  ['allen-ehp-2016', 'The lower TVOC concentrations (yet larger number of sources) in the present study were associated with statistically significant decrements in decision-making performance.', 'correlational'],
  ['allen-ehp-2016', 'Using low-emitting materials, which is common practice in Green buildings, reduces in-office VOC exposures.', 'direct-causal'],
  ['fixture-b-pew-html', 'Only 6% of workers say workplace AI use will lead to more job opportunities for them in the long run.', 'none'],
  ['jcu-timber-pilot', 'Because of small sample size, observations were not controlled (no randomization or environmental measurements), so findings should be interpreted as associative and exploratory rather than causal.', 'none'],
  ['allen-ehp-2016', 'More research is necessary to investigate the presence of these responses or the lack thereof.', 'none'],
]
for (const [id, s, want] of REGISTER) {
  const got = causalRegister(s).register
  log(`[${id}] register ${want}`, got === want, got === want ? '' : `got ${got}: ${s.slice(0, 80)}`)
}

const ADVICE = [
  ['gensler-gws-2024', 'Gensler’s Global Workplace Survey of more than 16,000 office workers across 15 countries and 10 industries reveals that companies need to adopt a people-first lens to evaluate the performance of their workplace.', 'strong'],
  ['allen-ehp-2016', 'Assessments performed in actual office environments are important to confirm the findings in a noncontrolled setting.', 'none'],
  ['fixture-b-pew-report', 'In addition to sampling error, one should bear in mind that question wording and practical difficulties in conducting surveys can introduce error or bias into the findings of opinion polls.', 'none'],
]
for (const [id, s, want] of ADVICE) {
  const got = recommendationStrength(s).strength
  log(`[${id}] advice ${want}`, got === want, got === want ? '' : `got ${got}`)
}

// Certainty: copulas and auxiliaries never make a claim strong.
const CERTAINTY = [
  ['allen-ehp-2016', 'The rooms are similarly constructed and have identical building materials.', 'measured'],
  ['regression-fixture', 'Our platform is the #1 best-in-class solution and is unmatched in the industry.', 'absolute'],
  ['allen-ehp-2016', 'By testing on subsequent days, it is possible that effects from one condition were reflected in the scores obtained on the next day.', 'hedged'],
]
for (const [id, s, want] of CERTAINTY) {
  const got = measureCertainty(s).tier
  log(`[${id}] certainty ${want}`, got === want, got === want ? '' : `got ${got}`)
}

// Held-out Yu-corpus metrics (cache only).
export const HELD_OUT_MACRO_F1_MIN = 0.65 // PROVISIONAL — floor so a lexicon change cannot silently degrade
if (existsSync(join(CACHE, 'yu2019', 'medical_meadow_pubmed_causal.json'))) {
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'eval-causal-register.mjs')], { stdio: 'ignore' })
  const { heldOut } = JSON.parse((await import('node:fs')).readFileSync(join(ROOT, 'checks', 'causal-register-eval.json'), 'utf8'))
  log(`Yu held-out macro-F1 ≥ ${HELD_OUT_MACRO_F1_MIN}`, heldOut.macroF1 >= HELD_OUT_MACRO_F1_MIN, `${heldOut.macroF1} (accuracy ${heldOut.accuracy}, n=${heldOut.n})`)
} else {
  console.log('SKIP yu2019 — corpus not cached (npm run fixtures:fetch does not fetch it; see scripts/eval-causal-register.mjs)')
}

if (!ok) { console.error('\nregister checks failed.'); process.exit(1) }
console.log('\nRegister checks passed.')
process.exit(0)
