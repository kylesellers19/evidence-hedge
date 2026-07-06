// ─────────────────────────────────────────────────────────────────────────────
// Right-of-reply (verification #6): "declined to comment" in a journalism
// document produces the positive right-of-reply signal AND no null-source
// penalty on that claim. Plain Node.
// ─────────────────────────────────────────────────────────────────────────────

import { analyze } from '../src/engine/analyze.js'
import { getRubric } from '../src/rubrics/index.js'

const DOC =
  'The council approved the rezoning in a closed session on Tuesday. ' +
  'The developer, Halton Group, said the project will create hundreds of jobs. ' +
  'The mayor declined to comment on the allegations of a conflict of interest.'

const result = analyze(DOC, getRubric('journalism'), 'news')

const signal = result.signals.find((s) => s.id === 'right-of-reply')
const replyClaim = result.claims.find((c) => /declined to comment/i.test(c.text))

let ok = true
const log = (label, pass, extra = '') => {
  if (!pass) ok = false
  console.log(`${pass ? 'PASS ✅' : 'FAIL ❌'}  ${label}${extra ? ' — ' + extra : ''}`)
}

log('right-of-reply signal emitted (positive)', !!signal && signal.positive === true,
  signal ? `evidence=${JSON.stringify(signal.evidence)}` : 'no signal')
log('containing claim was extracted', !!replyClaim, replyClaim ? `"${replyClaim.text}"` : 'not found')
log('no null-source penalty on that claim',
  !!replyClaim && replyClaim.flag !== 'unsupported-assertion',
  replyClaim ? `flag=${replyClaim.flag} disclosed=${replyClaim.disclosed}` : '')

if (!ok) { console.error('\nright-of-reply checks failed.'); process.exit(1) }
console.log('\nright-of-reply checks passed.')
process.exit(0)
