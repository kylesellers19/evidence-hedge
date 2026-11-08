// ─────────────────────────────────────────────────────────────────────────────
// Published-model predictions from the research repo (change set 2 supplies them).
//
// checks/data/predictions/<tool>-<commit>.jsonl, one row per unit or bundle row:
//   { tool, tool_commit, tier: 'predicted'|'weak', unit_id | row_id, labels,
//     trained_on: string[] }
//
// trained_on entries (PROVISIONAL — not ratified):
//   '<source>'               the model saw every row of that source
//   '<source>:<split>'       the model saw that split of the source
//   '<source>:out-of-fold'   trained on the source, but each row was scored by
//                            a model that never saw it (covers nothing)
//   '<fixture id>'           the model saw that fixture's units
// cessc_general and UniCausal are one source: either name covers both.
//
// labels (PROVISIONAL — not ratified; change set 2 writes to this contract):
//   causal_register  'none' | 'correlational' | 'conditional-causal' | 'direct-causal'
//   certainty        number on Pei & Jurgens' 1–6 scale
//   causal           true | false (causal sentence)
// A row whose source (or source:split, or fixture) is covered is dropped, and
// counted, so no prediction is scored on a row its model trained on.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { DATA } from './fixtures.mjs'

export const PREDICTIONS_DIR = join(DATA, 'predictions')
const ALIASES = { unicausal: 'cessc_general', cessc_general: 'cessc_general' }
const canon = (s) => ALIASES[String(s).toLowerCase()] || String(s).toLowerCase()

/** Is a target row covered by a prediction's trained_on? */
export function covers(trainedOn = [], target) {
  const source = canon(target.source)
  for (const entry of trainedOn) {
    const [s, scope] = String(entry).split(':')
    if (canon(s) !== source) continue
    if (scope === 'out-of-fold') continue
    if (!scope || scope === target.split) return true
  }
  return false
}

/** @returns {{status:'ok', tools:Map<string,object[]>, files:string[]} | {status:'skip', reason:string}} */
export function loadPredictions() {
  if (!existsSync(PREDICTIONS_DIR)) return { status: 'skip', reason: 'checks/data/predictions/ absent (change set 2 supplies it)' }
  const files = readdirSync(PREDICTIONS_DIR).filter((f) => f.endsWith('.jsonl')).sort()
  if (!files.length) return { status: 'skip', reason: 'no prediction files in checks/data/predictions/' }
  const tools = new Map()
  for (const f of files) {
    for (const line of readFileSync(join(PREDICTIONS_DIR, f), 'utf8').split('\n')) {
      if (!line.trim()) continue
      const row = JSON.parse(line)
      const name = `${row.tool}@${row.tool_commit}`
      if (!tools.has(name)) tools.set(name, [])
      tools.get(name).push(row)
    }
  }
  return { status: 'ok', tools, files }
}

/**
 * Predictions for the given targets, minus every row the model trained on.
 * @param {object[]} preds  one tool's rows
 * @param {Map<string,{source:string, split:string}>} targets  row/unit id → target
 */
export function usablePredictions(preds, targets) {
  const kept = new Map()
  let dropped = 0
  for (const p of preds) {
    const id = p.row_id ?? p.unit_id
    const target = targets.get(id)
    if (!target) continue
    if (covers(p.trained_on, target)) { dropped++; continue }
    kept.set(id, p)
  }
  return { kept, dropped }
}
