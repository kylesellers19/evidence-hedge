// ─────────────────────────────────────────────────────────────────────────────
// Review cards for the one-by-one corpus review (Part 2 of the corpus audit).
//
//   node scripts/audit-cards.mjs --tag run1 [--batch 25]
//
// Reads checks/data/audit/ledger-<tag>.jsonl and details-<tag>/, runs the
// automated screens, orders the queue (every displayed 1 and 10 first, then
// documents outside their stratum's expected range, then the rest), and writes
// one card file per batch of 25 to checks/data/audit/cards-<tag>/ with a
// queue.json beside it. Cards quote the documents, so they stay in the
// gitignored folder; the screens' counts go in the committed report.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT } from '../checks/lib/corpus.mjs'
import { measureCertainty } from '../src/engine/measure/certainty.js'

const arg = (name, dflt = null) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? dflt : process.argv[i + 1]
}
const OUT = join(ROOT, 'checks', 'data', 'audit')

export function loadLedger(tag) {
  return readFileSync(join(OUT, `ledger-${tag}.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
}

// ── strata (expected-ranges.json, written before the run) ────────────────────
const RESEARCHY = new Set(['research-like', 'press-release', 'standard'])
export function stratumOf(r) {
  const prov = r.gold?.provenance
  if (r.corpus === 'aec' || prov === 'firm-vendor') return RESEARCHY.has(r.posture) ? 'firm-vendor-research-like' : 'firm-vendor-marketing'
  if (prov === 'peer-reviewed-journal') return 'peer-reviewed-journal'
  if (prov === 'academic-press-office') return 'academic-press-release'
  if (prov === 'trade-press') return (r.gold?.genres || []).includes('opinion') ? 'trade-press-opinion' : 'trade-press-news'
  if (prov === 'news-outlet') return 'trade-press-news'
  if (prov === 'nonprofit-research') return 'nonprofit-research'
  if (prov === 'individual') return 'personal-experiential'
  return 'unassigned'
}

// ── automated screens: reasons to look, never verdicts ───────────────────────
const REF_LIKE = /\(\d{4}[a-z]?\)|\bet al\.|\bdoi\b|\bRetrieved\b|\bVol\.\s*\d|\bpp\.\s*\d|\bISBN\b|\bAccessed\b/i
const CAPTION = /^(?:figure|fig\.|table|source|sources|note|notes|exhibit|chart|graph|image|photo)\b/i
const CTA = /^(?:contact|learn more|download|visit|click|sign up|register|subscribe|call us|email us|get in touch|find out more|read more|join us)\b/i
const BYLINE = /^(?:by|written by|authors?:?|prepared by)\s+[A-Z]/
const WALL = /\b(?:cookies?|enable javascript|captcha|just a moment|access denied|subscribe to (?:read|continue)|sign in to continue|verify you are human)\b/i
const GARBLE = /([A-Za-z])\1\1[A-Za-z]*([A-Za-z])\2\2|[\u0000-\u0008\u000e-\u001f�]/
const MARKER = /\[\d+(?:[,–-]\s*\d+)*\]|\([A-Z][A-Za-z-]+(?: et al\.| and [A-Z][A-Za-z-]+)?,? \d{4}[a-z]?\)|https?:\/\/|\bwww\.|\baccording to\b|\bsource:/i
const WEAK_CUES = new Set(['always', 'never', 'will', 'is', 'are'])
const QUOTE_ATTR = /[“"][^”"]{20,}[”"].{0,80}\b(?:said|says|told|according to|notes|noted|explains|wrote)\b|\b(?:said|says|told)\b.{0,10}[“"]/i

export function screens(r, d, expected, dupShas) {
  const out = []
  if (r.status !== 'ok') return [`refused:${r.status}`]
  if (r.display === 1) out.push('EXTREME:1')
  if (r.display === 10) out.push('EXTREME:10')
  const st = stratumOf(r)
  const range = expected[st]?.range
  if (range && (r.score < range[0] || r.score > range[1])) out.push(`RANGE:${st} ${r.score} outside ${range.join('–')}`)
  if (!r.deterministic) out.push('DET:run twice differs')
  if (r.claimCountVariesByRubric) out.push(`DET:claims by rubric ${[r.claims, ...Object.values(r.byRubric).map((x) => x.claims)].join('/')}`)
  if (r.link && r.link.status === 'ok' && r.link.rubric !== r.rubric.id) out.push(`ROUTE:link reads ${r.link.judgedAs}`)
  if (r.provenance === 'unknown') out.push('ROUTE:publisher unknown')
  if ((r.flags['causal-overreach'] || 0) > 0) out.push('TEXT:headline counts include overreach not in "flagged"')
  if (dupShas.has(r.textSha)) out.push('INGEST:duplicate text')
  if (r.words < 300) out.push(`INGEST/HIGH:short ${r.words} words`)
  const perK = (r.claims / Math.max(1, r.words)) * 1000
  if (perK < 8 || perK > 70) out.push(`CLAIM:${perK.toFixed(0)} claims per 1,000 words`)
  if (d) {
    if (WALL.test(d.head) && r.words < 600) out.push('INGEST:wall words in head')
    if (GARBLE.test(d.head)) out.push('INGEST:garbled text in head')
    const c = (re) => d.picked.filter((p) => re.test(p.text)).length
    const ref = c(REF_LIKE), cap = c(CAPTION), cta = c(CTA), by = c(BYLINE), q = d.picked.filter((p) => /\?\s*$/.test(p.text)).length
    if (ref) out.push(`INGEST:${ref} picked claims look like reference entries`)
    if (cap) out.push(`INGEST:${cap} picked claims start like captions`)
    if (cta) out.push(`CLAIM:${cta} calls to action`)
    if (by) out.push(`CLAIM:${by} bylines`)
    if (q) out.push(`CLAIM:${q} questions`)
    const linkable = d.picked.filter((p) => p.flag === 'unsupported-assertion' && MARKER.test(p.text)).length
    if (linkable) out.push(`LINK:${linkable} unsupported claims carry a marker, link or "according to"`)
    const strong = d.picked.filter((p) => p.tier === 'assertive' || p.tier === 'absolute')
    const weakOnly = strong.filter((p) => { const m = measureCertainty(p.text); const cues = m.boosters; return cues.length && cues.every((x) => WEAK_CUES.has(x.toLowerCase())) }).length
    if (weakOnly) out.push(`TIER:${weakOnly} strong claims rest only on always/never/will`)
    const quoted = strong.filter((p) => QUOTE_ATTR.test(p.text)).length
    if (quoted) out.push(`TIER:${quoted} strong claims are quoted speech`)
  }
  return out
}

const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s)
const FLAG = { 'unsupported-assertion': 'UA', overconfident: 'OC' }
const TIER = { hedged: 'h', measured: 'm', assertive: 'A', absolute: 'X' }
const FN = { 'own-result': 'own', interpretation: 'interp', recommendation: 'rec', background: 'bg', method: 'meth', other: 'oth' }

function card(n, r, d, sc) {
  const L = []
  L.push(`### ${n}. ${r.id}`)
  L.push(`key ${r.key} · ${r.url || '(no link)'} · ${r.firm || r.corpus} · "${r.title}" ${r.published || ''} · ${r.mode} · ${r.words} words`)
  if (r.status !== 'ok') { L.push(`STATUS: ${r.status} (not scored by the site)`); return L.join('\n') }
  const b = r.breakdown || {}
  L.push(`ROUTE: ${r.rubric.judgedAs}${r.rubric.hybrid ? ` [${r.rubric.hybrid.join('+')}]` : ''} · held to ${r.rubric.standard} · posture ${r.posture} (${r.postureConfidence}) · provenance ${r.provenance} · design ${r.design} · roles ${Object.entries(r.roles).map(([k, v]) => `${k}=${v || '-'}`).join(' ')}${r.link ? ` · as a link: ${r.link.status === 'ok' ? `${r.link.judgedAs} ${r.link.posture} ${r.link.score}` : r.link.status}` : ''}`)
  L.push(`SCORE: ${r.score} (shown ${r.display}) ${r.band} · ${r.claims} claims · ${r.strong} strong · UA ${r.flags['unsupported-assertion']} OC ${r.flags.overconfident} CO ${r.flags['causal-overreach']} · at standard ${r.flaggedAtStandard} · refs ${r.references} · signals ${r.signals.join(', ') || 'none'}`)
  L.push(`BREAKDOWN: flags −${b.flagContribution} (rate ${b.flagRate}) · overreach −${b.overreachPenalty} · signals −${b.signalPenalty} · completeness −${b.completenessPenalty} · platitudes −${b.platitudePenalty} · self-citation −${b.selfCitationPenalty} · discounted ${b.provenanceDiscounted}`)
  L.push(`BY RUBRIC: ${Object.entries(r.byRubric).map(([k, v]) => `${k} ${v.claims}c ${v.score}`).join(' · ')} · repeat ${r.deterministic ? 'same' : 'DIFFERS'}`)
  L.push(`RENDERED: [${r.rendered.tagRowVisible}] dek: ${r.rendered.dek} | H1: ${r.rendered.headline} | box: ${r.rendered.verdictBox.score} ${r.rendered.verdictBox.summary} | stats ${r.rendered.stats.claimsWeighed}/${r.rendered.stats.readAsStrong}/${r.rendered.stats.flagged}`)
  L.push(`SCREENS: ${sc.join(' · ') || 'none'}`)
  if (d) {
    L.push('HEAD:')
    L.push(d.head.replace(/\n{2,}/g, '\n'))
    L.push(`TAIL: …${d.tail.replace(/\n{2,}/g, '\n')}`)
    L.push(`CLAIMS, flagged or strong (${d.picked.length} of ${d.claims}): #index flags certainty function [q c k d] | first 72 characters`)
    // Every flagged or strong claim, one short line each: U unsupported, O
    // overconfident (with the rung its citation reached), C overreach (with its
    // distance), S strong only (with its rung); then the certainty (m measured,
    // A assertive, X absolute, h hedged), the function, q for quoted or c for
    // someone else's finding, k when it carries a citation; then the first 72
    // characters. Exact repeats fold into one line with a count.
    const seen = new Map()
    for (const p of d.picked) {
      const f = [p.flag === 'unsupported-assertion' ? 'U' : '', p.flag === 'overconfident' ? `O:${p.rung}` : '', p.overreach ? `C${p.overreach}` : ''].filter(Boolean).join('+') || `S:${p.rung}`
      const who = p.attribution === 'quoted' ? ' q' : p.attribution === 'cited-other' ? ' c' : ''
      const line = `${f} ${TIER[p.tier]} ${FN[p.fn] || p.fn}${who}${p.citations.length ? ' k' : ''}${p.disclosed ? ' d' : ''}| ${clip(p.text.replace(/\s+/g, ' '), 72)}`
      if (seen.has(line)) seen.get(line).n++
      else seen.set(line, { i: p.i, n: 1 })
    }
    for (const [line, { i, n }] of seen) L.push(`#${i}${n > 1 ? `x${n}` : ''} ${line}`)
    // The brief flags at the detected posture; the score judges every claim at
    // the strictest one. When they differ, list the claims the score counted.
    if (d.strictPicked) {
      L.push(`AT THE SCORE'S STRICTEST SETTING (${d.strictPosture}): ${d.strictPicked.length} claims flagged; these drive the score. #index flag certainty function | first 72 characters`)
      const seen2 = new Map()
      for (const p of d.strictPicked) {
        const line = `${p.flag === 'unsupported-assertion' ? 'U' : `O:${p.rung}`} ${TIER[p.tier]} ${FN[p.fn] || p.fn}| ${clip(p.text.replace(/\s+/g, ' '), 72)}`
        if (seen2.has(line)) seen2.get(line).n++
        else seen2.set(line, { i: p.i, n: 1 })
      }
      for (const [line, { i, n }] of seen2) L.push(`#${i}${n > 1 ? `x${n}` : ''} ${line}`)
    }
  }
  return L.join('\n')
}

function main() {
  const tag = arg('tag', 'run1')
  const size = Number(arg('batch', 25))
  const rows = loadLedger(tag)
  const expected = JSON.parse(readFileSync(join(OUT, 'expected-ranges.json'), 'utf8')).strata
  const seen = new Map()
  for (const r of rows) if (r.textSha) seen.set(r.textSha, (seen.get(r.textSha) || 0) + 1)
  const dupShas = new Set([...seen].filter(([, n]) => n > 1).map(([s]) => s))
  const items = rows.map((r) => {
    const p = join(OUT, `details-${tag}`, `${r.key}.json`)
    const d = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null
    const sc = screens(r, d, expected, dupShas)
    const tier = r.status !== 'ok' ? 3 : sc.some((s) => s.startsWith('EXTREME')) ? 0 : sc.some((s) => s.startsWith('RANGE')) ? 1 : 2
    return { r, d, sc, tier }
  })
  items.sort((a, b) => a.tier - b.tier)
  const dir = join(OUT, `cards-${tag}`)
  mkdirSync(dir, { recursive: true })
  const queue = []
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size)
    const no = String(i / size + 1).padStart(2, '0')
    mkdirSync(join(dir, `batch-${no}`), { recursive: true })
    batch.forEach((x, j) => writeFileSync(join(dir, `batch-${no}`, `${String(j + 1).padStart(2, '0')}.md`), card(i + j + 1, x.r, x.d, x.sc) + '\n'))
    queue.push({ batch: no, ids: batch.map((x) => x.r.id), screens: Object.fromEntries(batch.map((x) => [x.r.id, x.sc])) })
  }
  writeFileSync(join(dir, 'queue.json'), JSON.stringify(queue, null, 1))
  const tally = {}
  for (const x of items) for (const s of x.sc) { const k = s.split(':')[0]; tally[k] = (tally[k] || 0) + 1 }
  console.log(`${items.length} documents, ${queue.length} batches`, tally)
}

if (fileURLToPath(import.meta.url) === process.argv[1]) main()
