// The reports each reference selection compares, as the statistics receive
// them, for scripts/compare-reference.py:
//   node scripts/compare-inputs.mjs   → checks/targets/compare/reference-inputs.json
import { writeFileSync } from 'node:fs'
import { loadRows, inputOf } from '../checks/lib/compare-run.mjs'
import { SELECTIONS, SMALL } from '../checks/lib/compare-selections.mjs'
import { COMPARE_CONSTANTS } from '../src/list/compare/constants.js'

const rows = loadRows()
const out = { constants: COMPARE_CONSTANTS, selections: [] }
for (const sel of [...SELECTIONS, SMALL]) {
  const { input, data } = inputOf(rows, sel)
  out.selections.push({ slug: sel.slug, build: data.build, types: data.types, measures: input.measures,
    firms: input.firms.map((f) => ({ name: f.name, reports: f.reports.map(({ type, score, year, claims, unsupported, overconfident, overreach }) => ({ type, score, year, claims, unsupported, overconfident, overreach })) })) })
}
writeFileSync(new URL('../checks/targets/compare/reference-inputs.json', import.meta.url), JSON.stringify(out) + '\n')
console.log(out.selections.map((s) => `${s.slug}: ${s.firms.map((f) => `${f.name} ${f.reports.length}`).join(', ')}`).join('\n'))
