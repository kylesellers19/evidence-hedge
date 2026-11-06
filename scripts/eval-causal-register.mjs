// ─────────────────────────────────────────────────────────────────────────────
// node scripts/eval-causal-register.mjs [--dev] — score causalRegister against
// the Yu, Li & Wang (2019) corpus.
//
// Source: Hugging Face medalpaca/medical_meadow_pubmed_causal (2,446 of the
// paper's 3,061 sentences), cached in fixtures/cache/yu2019/ (never committed:
// the card declares no licence; upstream junwang4/causal-language-use-in-science
// is GPL-3.0). The card's text labels are ROTATED against the paper: joined
// sentence-for-sentence to the upstream CSV (0 unmatched), "directly
// correlative" = Yu 0 (none), "conditionally causative" = Yu 3 (correlational),
// "causative" = Yu 2 (conditional causal), "no relationship" = Yu 1 (direct
// causal). The corrected labels are used here.
//
// Split: seeded shuffle, 70% development (lexicon tuning) / 30% held out.
// Default prints held-out metrics; --dev prints development metrics.
// Writes checks/causal-register-eval.json (numbers only).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, CACHE } from '../checks/lib/corpus.mjs'
import { causalRegister, REGISTERS } from '../src/engine/measure/causalRegister.js'

const FILE = join(CACHE, 'yu2019', 'medical_meadow_pubmed_causal.json')
if (!existsSync(FILE)) { console.log('SKIP yu2019 — fixtures/cache/yu2019/medical_meadow_pubmed_causal.json absent'); process.exit(0) }

const LABEL = {
  'This is a directly correlative relationship': 'none',
  'This is a conditionally causative relationship': 'correlational',
  'This is a causative relationship': 'conditional-causal',
  'This no relationship.': 'direct-causal',
}
export const SEED = 20191103 // PROVISIONAL — EMNLP 2019 opening day

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rows = JSON.parse(readFileSync(FILE, 'utf8')).map((r) => ({ text: r.input.trim().replace(/^"|"$/g, ''), gold: LABEL[r.output] }))
const rand = mulberry32(SEED)
const order = rows.map((r, i) => [rand(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => rows[i])
const cut = Math.round(order.length * 0.7)
const splits = { development: order.slice(0, cut), heldOut: order.slice(cut) }

function metrics(set) {
  const confusion = Object.fromEntries(REGISTERS.map((g) => [g, Object.fromEntries(REGISTERS.map((p) => [p, 0]))]))
  for (const r of set) confusion[r.gold][causalRegister(r.text).register]++
  const perClass = {}
  for (const c of REGISTERS) {
    const tp = confusion[c][c]
    const fp = REGISTERS.reduce((s, g) => s + (g === c ? 0 : confusion[g][c]), 0)
    const fn = REGISTERS.reduce((s, p) => s + (p === c ? 0 : confusion[c][p]), 0)
    const precision = tp + fp ? tp / (tp + fp) : 0
    const recall = tp + fn ? tp / (tp + fn) : 0
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
    perClass[c] = { n: tp + fn, precision: +precision.toFixed(3), recall: +recall.toFixed(3), f1: +f1.toFixed(3) }
  }
  const accuracy = REGISTERS.reduce((s, c) => s + confusion[c][c], 0) / set.length
  const macroF1 = REGISTERS.reduce((s, c) => s + perClass[c].f1, 0) / REGISTERS.length
  return { n: set.length, accuracy: +accuracy.toFixed(3), macroF1: +macroF1.toFixed(3), perClass, confusion }
}

const out = { source: 'medalpaca/medical_meadow_pubmed_causal (labels corrected to Yu 2019)', seed: SEED, split: '70/30',
  development: metrics(splits.development), heldOut: metrics(splits.heldOut) }
writeFileSync(join(ROOT, 'checks', 'causal-register-eval.json'), JSON.stringify(out, null, 2) + '\n')

const show = process.argv.includes('--dev') ? 'development' : 'heldOut'
const m = out[show]
console.log(`${show}: n=${m.n} accuracy ${m.accuracy} macro-F1 ${m.macroF1}`)
for (const c of REGISTERS) console.log(`  ${c.padEnd(19)} P ${m.perClass[c].precision}  R ${m.perClass[c].recall}  F1 ${m.perClass[c].f1}  (n=${m.perClass[c].n})`)
console.log('  confusion (rows gold → cols predicted):')
for (const g of REGISTERS) console.log(`  ${g.padEnd(19)} ${REGISTERS.map((p) => String(m.confusion[g][p]).padStart(5)).join('')}`)
if (process.argv.includes('--errors')) {
  for (const r of splits.development) { const p = causalRegister(r.text); if (p.register !== r.gold) console.log(`[${r.gold} → ${p.register}] ${r.text.slice(0, 160)} {${p.cues.map((c) => c.root).join(',')}}`) }
}
