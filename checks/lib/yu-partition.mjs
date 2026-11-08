// ─────────────────────────────────────────────────────────────────────────────
// Which Yu 2019 sentences the causal-register rules were tuned on.
//
// scripts/eval-causal-register.mjs tuned the lexicon on a seeded 70% of the
// Hugging Face copy (medalpaca/medical_meadow_pubmed_causal, 2,446 of Yu's
// 3,061 sentences) and held out the rest. That script writes a file when
// imported, so its split is reproduced here: same rows, same label correction,
// same seed and generator. checks/benchmark-guards.test.mjs fails if this copy
// stops reproducing checks/causal-register-eval.json.
//
// Partitions, joined by text key:
//   engine-tuning     the 70% the lexicon was tuned on
//   engine-held-out   the 30% held out
//   never-seen        in Yu's corpus but not in the Hugging Face copy
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { CACHE } from './corpus.mjs'
import { mulberry32 } from './metrics.mjs'

export const MEDALPACA = join(CACHE, 'yu2019', 'medical_meadow_pubmed_causal.json')
export const UPSTREAM_CSV = join(CACHE, 'yu2019', 'pubmed_causal_language_use.csv')

// ── Copied from scripts/eval-causal-register.mjs @ dc34856 ──────────────────
const LABEL = {
  'This is a directly correlative relationship': 'none',
  'This is a conditionally causative relationship': 'correlational',
  'This is a causative relationship': 'conditional-causal',
  'This no relationship.': 'direct-causal',
}
export const SEED = 20191103
export const DEV_SHARE = 0.7
// ── End of copy ──────────────────────────────────────────────────────────────

// Letters and digits only, lowercased: the join key between corpus copies.
export const textKey = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** @returns {{status:'ok', development:{text:string,gold:string}[], heldOut:{text:string,gold:string}[], partitionOf:(text:string)=>string} | {status:'skip', reason:string}} */
export function yuEnginePartition() {
  if (!existsSync(MEDALPACA)) return { status: 'skip', reason: 'fixtures/cache/yu2019/medical_meadow_pubmed_causal.json absent' }
  const rows = JSON.parse(readFileSync(MEDALPACA, 'utf8')).map((r) => ({ text: r.input.trim().replace(/^"|"$/g, ''), gold: LABEL[r.output] }))
  const rand = mulberry32(SEED)
  const order = rows.map((r) => [rand(), r]).sort((a, b) => a[0] - b[0]).map(([, r]) => r)
  const cut = Math.round(order.length * DEV_SHARE)
  const development = order.slice(0, cut)
  const heldOut = order.slice(cut)
  const part = new Map()
  for (const r of heldOut) part.set(textKey(r.text), 'engine-held-out')
  // A sentence in both halves (duplicates in the copy) counts as tuned on.
  for (const r of development) part.set(textKey(r.text), 'engine-tuning')
  return { status: 'ok', development, heldOut, partitionOf: (text) => part.get(textKey(text)) || 'never-seen' }
}

/** Yu's upstream CSV: sentence → upstream code (0 none, 1 direct, 2 conditional, 3 correlational). */
export function yuUpstreamCodes() {
  if (!existsSync(UPSTREAM_CSV)) return null
  const lines = readFileSync(UPSTREAM_CSV, 'utf8').split(/\r?\n/).slice(1).filter(Boolean)
  const codes = new Map()
  for (const line of lines) {
    const m = line.match(/^(.*),(\d)$/)
    if (!m) continue
    const text = m[1].replace(/^"|"$/g, '').replace(/""/g, '"')
    codes.set(textKey(text), Number(m[2]))
  }
  return codes
}
