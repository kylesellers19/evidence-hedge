// ─────────────────────────────────────────────────────────────────────────────
// Foundations bundle v2 loader: unified_eval.jsonl, published human labels.
//
// Expected at checks/data/foundations-v2/unified_eval.jsonl (gitignored; GPL and
// unlicensed rows never enter the repo). Rows marked label_conflict are skipped;
// rows can be filtered by split (train / val / test, assigned by group_id).
//
// FIELDS names every field the benchmark reads. They were written before the
// bundle was on disk, so they are UNVERIFIED: a missing field throws a
// SchemaError listing the row's actual keys, and the check stops there instead
// of guessing. PROVISIONAL — not ratified.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { DATA } from './fixtures.mjs'

// EH_BUNDLE points the loader at another copy (a smoke test of the loader).
export const BUNDLE_PATH = process.env.EH_BUNDLE || join(DATA, 'foundations-v2', 'unified_eval.jsonl')
export const SPLITS = ['train', 'val', 'test']

export const FIELDS = {
  id: 'id',
  source: 'source',
  split: 'split',
  group: 'group_id',
  conflict: 'label_conflict',
  text: 'text',
  yuStrength: 'labels.causal_strength',   // yu2019_pubmed, yu2020_eureka
  certainty: 'labels.certainty',          // pei2021, 1–6
  causal: 'labels.causal',                // cessc_ssc, cessc_general: yes / no
  pressText: 'press_text',                // wright2021_pairs
  abstractText: 'abstract_text',
  pressStrength: 'labels.press_strength',
  abstractStrength: 'labels.abstract_strength',
  exaggeration: 'labels.exaggeration',    // same / exaggerates / downplays
}

export class SchemaError extends Error {
  constructor(field, row) {
    super(`bundle field "${field}" absent on ${row?.[FIELDS.source] ?? '?'} row; row keys: ${Object.keys(row || {}).join(', ')}`)
    this.field = field
  }
}

const read = (row, path) => { let v = row; for (const k of path.split('.')) v = v == null ? undefined : v[k]; return v }

/** Read a dotted field; throw SchemaError when it is absent. */
export function field(row, name) {
  const path = FIELDS[name] || name
  const v = read(row, path)
  if (v === undefined) throw new SchemaError(path, row)
  return v
}

/** Read a dotted field that some rows of a source legitimately lack (null when absent). */
export const fieldOr = (row, name) => read(row, FIELDS[name] || name) ?? null

/**
 * @param {{ source?: string, split?: string }} [filter]
 * @returns {{status:'ok', rows:object[], conflicts:number, path:string} | {status:'skip', reason:string}}
 */
export function loadBundle(filter = {}) {
  if (!existsSync(BUNDLE_PATH)) return { status: 'skip', reason: `${process.env.EH_BUNDLE || 'checks/data/foundations-v2/unified_eval.jsonl'} absent` }
  const all = readFileSync(BUNDLE_PATH, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  let conflicts = 0
  const rows = []
  for (const r of all) {
    for (const f of ['id', 'source', 'split', 'group']) field(r, f)
    if (r[FIELDS.conflict]) { conflicts++; continue }
    if (filter.source && r[FIELDS.source] !== filter.source) continue
    if (filter.split && r[FIELDS.split] !== filter.split) continue
    rows.push(r)
  }
  return { status: 'ok', rows, conflicts, path: BUNDLE_PATH }
}
