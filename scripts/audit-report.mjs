// ─────────────────────────────────────────────────────────────────────────────
// The corpus audit's numbers, from its ledgers and review verdicts.
//
//   node scripts/audit-report.mjs [--before run1] [--after run2]
//
// Writes checks/data/audit/report-numbers.json and report-tables.md (both
// gitignored: the examples quote claim text) and prints the text-free tables
// the committed report (checks/reports/corpus-audit-5160fcd.md) is built from.
// Document text never leaves the gitignored folder; the committed tables name
// documents by id and link only.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../checks/lib/corpus.mjs'
import { stratumOf } from './audit-cards.mjs'

const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? dflt : process.argv[i + 1] }
const BEFORE = arg('before', 'run1')
const AFTER = arg('after', 'run2')
const A = join(ROOT, 'checks', 'data', 'audit')
const AEC = join(ROOT, 'checks', 'data', 'aec')
const load = (tag) => existsSync(join(A, `ledger-${tag}.jsonl`)) ? readFileSync(join(A, `ledger-${tag}.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : null
const before = load(BEFORE)
const after = load(AFTER)
const expected = JSON.parse(readFileSync(join(A, 'expected-ranges.json'), 'utf8')).strata
const reviews = new Map()
for (const f of readdirSync(join(A, `reviews-${BEFORE}`)).filter((f) => f.endsWith('.jsonl')).sort()) {
  for (const l of readFileSync(join(A, `reviews-${BEFORE}`, f), 'utf8').split('\n').filter(Boolean)) {
    try { const v = JSON.parse(l); reviews.set(v.id, { ...v, chunk: f.replace('.jsonl', '') }) } catch { console.error(`bad line in ${f}`) }
  }
}
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—')
const n = (x) => Number(x).toLocaleString('en-US')
const out = {}

// ── 1. corpus counts ─────────────────────────────────────────────────────────
const st = {}
for (const r of before) { st[r.corpus] ||= {}; st[r.corpus][r.status] = (st[r.corpus][r.status] || 0) + 1 }
const shaSeen = new Map()
for (const r of before) if (r.textSha && r.status === 'ok') shaSeen.set(r.textSha, [...(shaSeen.get(r.textSha) || []), r.id])
const dups = [...shaSeen.values()].filter((ids) => ids.length > 1)
const coverage = readdirSync(AEC).filter((f) => f.startsWith('coverage-')).flatMap((f) => JSON.parse(readFileSync(join(AEC, f), 'utf8')))
const blocked = coverage.filter((c) => c.blocked).map((c) => ({ firm: c.firm, reason: String(c.blocked).slice(0, 90) }))
const gated = coverage.filter((c) => (c.gated || []).length).map((c) => ({ firm: c.firm, items: (c.gated || []).length }))
const scored = before.filter((r) => r.status === 'ok' && r.score != null)
out.counts = {
  documents: before.length, byCorpus: st,
  aecFirmsSearched: coverage.length, aecFirmsBlocked: blocked.length, aecFirmsGated: gated.length, aecGatedItems: gated.reduce((s, g) => s + g.items, 0),
  blockedReasons: blocked.reduce((m, b) => { const k = /cloudflare|just a moment/i.test(b.reason) ? 'Cloudflare challenge' : /robots/i.test(b.reason) ? 'robots.txt disallows' : /akamai|403/i.test(b.reason) ? 'Akamai or other 403' : /429/.test(b.reason) ? 'HTTP 429 rate limit' : /tls|reset/i.test(b.reason) ? 'TLS or connection reset' : /401|wp-json|media/i.test(b.reason) ? 'media listing closed (401)' : 'other'; m[k] = (m[k] || 0) + 1; return m }, {}),
  duplicateTexts: dups.length, documentsInDuplicateGroups: dups.reduce((s, d) => s + d.length, 0), duplicateGroups: dups,
  scoredWithScore: scored.length, unscoredNoClaims: before.filter((r) => r.status === 'ok' && r.score == null).length,
  reviewed: reviews.size, anomalyVerdicts: [...reviews.values()].filter((v) => v.verdict !== 'ok').length,
}

// ── 2. determinism and rubric variance ───────────────────────────────────────
const ok = before.filter((r) => r.status === 'ok')
out.determinism = { runs: ok.length, deterministic: ok.filter((r) => r.deterministic).length, claimCountVariesByRubric: ok.filter((r) => r.claimCountVariesByRubric).length,
  journalismDiffers: ok.filter((r) => r.byRubric.journalism.claims !== r.claims).length, othersDiffer: ok.filter((r) => ['research', 'corporate', 'general'].some((k) => r.byRubric[k].claims !== r.claims)).length }

// ── 3. histograms and strata ─────────────────────────────────────────────────
const hist = {}
for (const r of ok) { const k = r.rubric.standard; hist[k] ||= {}; const b = r.display == null ? 'none' : r.display; hist[k][b] = (hist[k][b] || 0) + 1 }
out.histograms = hist
const one = scored.filter((r) => r.display === 1)
const mean = (xs, k) => +(xs.reduce((s, r) => s + (r.breakdown[k] || 0), 0) / Math.max(1, xs.length)).toFixed(2)
out.pileUp = { atOne: one.length, atTen: scored.filter((r) => r.display === 10).length, floored: scored.filter((r) => r.score === 1).length,
  meanLossAtOne: { flagRate: mean(one, 'flagContribution'), overreach: mean(one, 'overreachPenalty'), signals: mean(one, 'signalPenalty'), completeness: mean(one, 'completenessPenalty'), platitudes: mean(one, 'platitudePenalty'), selfCitation: mean(one, 'selfCitationPenalty') },
  flagRateAloneFloors: one.filter((r) => r.breakdown.flagContribution >= 9).length,
  overreachAtCap: one.filter((r) => r.breakdown.overreachPenalty >= 2.5).length }
const strata = {}
for (const r of scored) { const s = stratumOf(r); strata[s] ||= []; strata[s].push(r.score) }
out.strata = Object.fromEntries(Object.entries(expected).map(([k, e]) => {
  const xs = (strata[k] || []).sort((a, b) => a - b)
  const inside = xs.filter((x) => x >= e.range[0] && x <= e.range[1]).length
  return [k, { expected: e.range, documents: xs.length, median: xs.length ? xs[Math.floor((xs.length - 1) / 2)] : null, min: xs[0] ?? null, max: xs[xs.length - 1] ?? null, inside, outside: xs.length - inside }]
}))

// ── 4. anomaly codes: reviewers' plus the script-coded TEXT and DET ──────────
const CODES = ['INGEST', 'ROUTE', 'CLAIM', 'TIER', 'LINK', 'LOW', 'HIGH', 'TEXT', 'DET']
const reviewed = [...reviews.values()]
const reviewerCount = Object.fromEntries(CODES.map((c) => [c, reviewed.filter((v) => (v.codes || []).some((x) => x.code === c)).length]))
// The script-coded items (the review brief's "coded by script" list), per
// document, on the brief as it was at baseline (run1's rendered strings).
const text = { overreachNotInFlagged: 0, strictDiffersFromShown: 0, genreContradiction: 0, singularCitesThem: 0, postureMixedCase: 0, zeroClaimWording: 0, any: 0 }
const textIds = new Set()
for (const r of ok) {
  const R = r.rendered
  const hits = []
  if ((r.flags['causal-overreach'] || 0) > 0) hits.push('overreachNotInFlagged')
  if (r.breakdown && !r.breakdown.gate && !r.breakdown.unscored && r.flaggedAtStandard !== r.flags['unsupported-assertion'] + r.flags.overconfident) hits.push('strictDiffersFromShown')
  if (r.rubric.standard === 'corporate' && /research (reporting|evidence) standards/.test(R.dek || '')) hits.push('genreContradiction')
  if (/\b1 cites sources too weak to carry them\b/.test(R.headline)) hits.push('singularCitesThem')
  if (/-/.test(r.posture) && R.tagRowVisible && /[A-Z][a-z]+-[A-Z]/.test(R.tagRowVisible)) hits.push('postureMixedCase')
  if (r.claims === 0 && /No assertive claims/.test(R.headline)) hits.push('zeroClaimWording')
  for (const h of hits) text[h]++
  if (hits.length) { text.any++; textIds.add(r.id) }
}
out.textScript = text
out.codes = Object.fromEntries(CODES.map((c) => {
  const rev = reviewerCount[c]
  if (c === 'TEXT') return [c, { reviewer: rev, script: text.any, documents: new Set([...reviewed.filter((v) => (v.codes || []).some((x) => x.code === 'TEXT')).map((v) => v.id), ...textIds]).size }]
  if (c === 'DET') return [c, { reviewer: rev, script: out.determinism.claimCountVariesByRubric + (out.determinism.runs - out.determinism.deterministic), documents: out.determinism.claimCountVariesByRubric }]
  return [c, { reviewer: rev, documents: rev }]
}))
out.okVerdicts = reviewed.filter((v) => v.verdict === 'ok').length
out.reviewedLines = reviewed.reduce((s, v) => s + (v.read?.lines || 0), 0)

// Examples: three per code, from the review notes (full report only).
out.examples = Object.fromEntries(CODES.map((c) => [c, reviewed.filter((v) => (v.codes || []).some((x) => x.code === c)).slice(0, 400)
  .map((v) => ({ id: v.id, ...v.codes.find((x) => x.code === c) })).filter((x, i, all) => all.findIndex((y) => y.id.split('/')[1] === x.id.split('/')[1]) === i).slice(0, 3)]))

// ── 5. LOW and HIGH, strongest first ─────────────────────────────────────────
// Strength = the reviewer's fair estimate (the midpoint of the first number
// range in `fair`) minus the score, for LOW; the reverse for HIGH.
const fairMid = (s) => { const m = /(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)/.exec(s || '') || /about (\d+(?:\.\d+)?)/.exec(s || ''); return m ? (m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1])) : null }
const byId = new Map(before.map((r) => [r.id, r]))
const rank = (code, sign) => reviewed.filter((v) => (v.codes || []).some((x) => x.code === code)).map((v) => {
  const r = byId.get(v.id); const f = fairMid(v.fair)
  return { id: v.id, url: r?.url, score: r?.score, fair: v.fair, fairMid: f, strength: f == null || r?.score == null ? -99 : sign * (f - r.score), note: v.codes.find((x) => x.code === code).note }
}).sort((a, b) => b.strength - a.strength)
out.low = rank('LOW', 1)
out.high = rank('HIGH', -1)

// ── 6. previously reported failures ──────────────────────────────────────────
const parity = existsSync(join(A, `parity-${BEFORE}.json`)) ? JSON.parse(readFileSync(join(A, `parity-${BEFORE}.json`), 'utf8')) : []
out.parity = parity.map((p) => { const r = byId.get(p.id); const R = r.rendered; return { id: p.id, mode: r.mode, match: R.verdictBox.score === p.box && R.tagRow === p.tag && R.headline === p.h1 && [R.stats.claimsWeighed, R.stats.readAsStrong, R.stats.flagged].join() === p.stats.join(), live: !!p.live } })

// ── 7. Part 7: every engine output identical before and after ───────────────
if (after) {
  const a = new Map(after.map((r) => [r.id, r]))
  const diffs = []
  for (const r of before) {
    const s = a.get(r.id)
    if (!s) { diffs.push({ id: r.id, why: 'missing after' }); continue }
    if (r.status !== s.status) { diffs.push({ id: r.id, why: `status ${r.status} → ${s.status}` }); continue }
    if (r.status !== 'ok') continue
    const same = r.sig === s.sig && r.score === s.score && r.claims === s.claims && r.strong === s.strong && JSON.stringify(r.flags) === JSON.stringify(s.flags) && r.rubric.id === s.rubric.id && r.posture === s.posture && JSON.stringify(r.signals) === JSON.stringify(s.signals) && JSON.stringify(r.byRubric) === JSON.stringify(s.byRubric) && (r.link?.sig || null) === (s.link?.sig || null)
    if (!same) diffs.push({ id: r.id, why: 'engine output differs' })
  }
  out.identity = { before: BEFORE, after: AFTER, documents: before.length, compared: before.filter((r) => a.has(r.id)).length, differ: diffs.length, diffs: diffs.slice(0, 20), engineAfter: [...new Set(after.map((r) => r.engine))] }
}

writeFileSync(join(A, 'report-numbers.json'), JSON.stringify(out, null, 1))
const short = { ...out, examples: undefined, low: out.low.slice(0, 20).map(({ id, score, fairMid, strength }) => ({ id, score, fairMid, strength })), high: out.high.slice(0, 20).map(({ id, score, fairMid, strength }) => ({ id, score, fairMid, strength })), counts: { ...out.counts, duplicateGroups: undefined } }
console.log(JSON.stringify(short, null, 1))

// ── text-free tables for the committed report ────────────────────────────────
const L = []
const t = (head, rows) => { L.push(`| ${head.join(' | ')} |`, `|${head.map((h, i) => (i ? '---:' : '---')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`), '') }
L.push('### Corpus counts', '')
t(['Stage', 'AEC', 'Gold', 'Fixture C', 'Academic'], [
  ['In the corpus', ...['aec', 'gold', 'fixture', 'academic'].map((k) => n(Object.values(st[k] || {}).reduce((a, b) => a + b, 0)))],
  ['Scored by the site\'s gates', ...['aec', 'gold', 'fixture', 'academic'].map((k) => n(st[k]?.ok || 0))],
  ['Refused: no text layer', ...['aec', 'gold', 'fixture', 'academic'].map((k) => n(st[k]?.empty || 0))],
  ['Refused: not English', ...['aec', 'gold', 'fixture', 'academic'].map((k) => n(st[k]?.['not-english'] || 0))],
  ['File absent', ...['aec', 'gold', 'fixture', 'academic'].map((k) => n(st[k]?.missing || 0))],
])
L.push('### Score shown, by the standard the document was held to', '')
const bins = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'none']
t(['Standard', ...bins.map((b) => (b === 'none' ? 'no score' : b)), 'documents'], Object.entries(hist).map(([k, h]) => [k, ...bins.map((b) => n(h[b] || 0)), n(Object.values(h).reduce((a, b) => a + b, 0))]))
L.push('### Expected and actual, per stratum', '')
t(['Stratum', 'Expected', 'Documents', 'Median', 'Min', 'Max', 'Inside', 'Outside'], Object.entries(out.strata).map(([k, s]) => [k, s.expected.join('–'), n(s.documents), s.median ?? '—', s.min ?? '—', s.max ?? '—', n(s.inside), n(s.outside)]))
L.push('### Anomaly codes', '')
t(['Code', 'Documents', 'Share of reviewed', 'Coded by'], CODES.map((c) => { const x = out.codes[c]; return [c, n(x.documents), pct(x.documents, c === 'TEXT' || c === 'DET' ? ok.length : reviewed.length), c === 'TEXT' ? `reviewers ${x.reviewer} + script ${x.script}` : c === 'DET' ? 'script' : 'reviewers'] }))
L.push(`Reviewed: ${n(reviewed.length)} documents, ${n(out.okVerdicts)} \`ok\`, ${n(reviewed.length - out.okVerdicts)} with at least one code; ${n(out.reviewedLines)} claim lines read.`, '')
L.push('### Script-coded TEXT, by cause (baseline page)', '')
t(['Cause', 'Documents'], Object.entries(text).map(([k, v]) => [k, n(v)]))
L.push('### Parity, live site', '')
t(['Document', 'Mode', 'Matches'], out.parity.map((p) => [p.id, p.mode, p.match ? 'yes' : p.live ? 'no (reader text changed; harness on current text matches)' : 'no']))
if (out.identity) { L.push('### Before and after (Part 7)', ''); t(['Compared', 'Differ', 'Engine after'], [[n(out.identity.compared), n(out.identity.differ), out.identity.engineAfter.join(', ')]]) }
writeFileSync(join(A, 'report-tables.md'), L.join('\n'))
