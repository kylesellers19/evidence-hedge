// ─────────────────────────────────────────────────────────────────────────────
// public/list-flag-counts.json: the corpus audit's three flag counts for each
// of its entries on The List, so the compare tool works before the table has
// docs/the-list.sql's version 3 columns.
//
//   node scripts/compare-snapshot.mjs && node scripts/list-counts-file.mjs
//
// Read from the snapshot (checks/targets/compare/list-rows.json), whose counts
// come from the ledger row that gave each score. Each row is
// [id, build, score, claims, flagged, unsupported, overconfident, overreach];
// the site uses a row only when the entry's build, score, claims and flagged
// still match it (src/list/entry.js withFileCounts). List rows are public; the
// file holds numbers and build tags only, no names, links or document text.
// Once the table has the counts, the table's own values are used and the file
// can go.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import { countsHold } from '../src/list/entry.js'

const rows = JSON.parse(readFileSync(new URL('../checks/targets/compare/list-rows.json', import.meta.url), 'utf8'))
const audit = rows.filter((r) => r.origin === 'audit')
const out = audit.map((r) => {
  const e = { claims: r.claims, flagged: r.flagged, unsupported: r.unsupported, overconfident: r.overconfident, overreach: r.overreach }
  if (!countsHold(e)) throw new Error(`entry ${r.id}: counts fail the table's checks`)
  return [r.id, r.engine, Number(r.score), r.claims, r.flagged, r.unsupported, r.overconfident, r.overreach]
})
const file = new URL('../public/list-flag-counts.json', import.meta.url)
writeFileSync(file, `{"columns":["id","engine","score","claims","flagged","unsupported","overconfident","overreach"],"rows":[\n` +
  out.map((r) => JSON.stringify(r)).join(',\n') + '\n]}\n')
console.log(`${out.length} audit entries → public/list-flag-counts.json`)
