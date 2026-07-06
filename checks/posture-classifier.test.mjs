// ─────────────────────────────────────────────────────────────────────────────
// Posture classifier checks (verification #4). Plain Node, no harness.
// ─────────────────────────────────────────────────────────────────────────────

import { classifyPosture } from '../src/engine/classifyPosture.js'
import { getRubric } from '../src/rubrics/index.js'

const cases = [
  {
    name: 'corporate: n=400 + % of respondents → research-like',
    rubric: 'corporate',
    text: 'In our study we surveyed the market (n = 400). The data shows that 62% of respondents preferred the new workflow, per the methodology in Table 2.',
    expect: 'research-like',
  },
  {
    name: 'corporate: CTA-heavy → marketing',
    rubric: 'corporate',
    text: 'Ready to transform your business? Contact us today to learn more. Get started with the #1 best-in-class platform and see why you deserve the best. Sign up now.',
    expect: 'marketing',
  },
  {
    name: 'general: "in my experience" narrative → experiential',
    rubric: 'general',
    text: 'In my experience, mornings are the hardest. When I started journaling I felt calmer, and for me that small habit changed how I approached the day. I tried it for months.',
    expect: 'experiential',
  },
  {
    name: 'general: same narrative + prescriptive YMYL → authoritative',
    rubric: 'general',
    text: 'In my experience, mornings are the hardest. When I started, I felt calmer. You should never take melatonin with your blood pressure medication — it is dangerous and can cause serious health problems.',
    expect: 'authoritative',
  },
]

let failed = 0
for (const c of cases) {
  const rubric = getRubric(c.rubric)
  const { posture, confidence, evidence } = classifyPosture(c.text, rubric)
  const ok = posture === c.expect
  if (!ok) failed++
  console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'}  ${c.name} → got "${posture}" (conf ${confidence})`)
  if (!ok) console.log('        evidence:', JSON.stringify(evidence))
}

if (failed) {
  console.error(`\n${failed} posture check(s) failed.`)
  process.exit(1)
}
console.log('\nAll posture classifier checks passed.')
process.exit(0)
