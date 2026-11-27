// ─────────────────────────────────────────────────────────────────────────────
// The text of a comparison, from templates filled by the statistics. No
// language model: each sentence is chosen by rule and every number in it is a
// formatted value of a statistics row the sentence cites (sentence.cites), so
// a check can prove it. Only results that pass (verdict "differs") are
// described as differences; the rest are said not to be told apart, or to
// have too few reports.
//
// Order: the lead; for each other firm, its score, the score with report type
// accounted for when that changes the verdict or the sign, and its largest
// flag differences; then trends that pass, and trend gaps that pass. At most
// MAX_SENTENCES. When nothing differs, one sentence says so, with the counts.
// ─────────────────────────────────────────────────────────────────────────────

import { COMPARE_CONSTANTS as K } from './constants.js'
import { formatRow, possessive, joinAnd, flagLabel, typesPhrase, typePlural } from './format.js'

const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]))
const RANK = { none: 0, lead: 0, differs: 1, apart: 2, few: 2, type: 3, mix: 4, flag: 5, trend: 6, gap: 7 }

// Over MAX_SENTENCES, the highest rank goes first, last ones first, but never
// the last sentence of a kind of finding (flags, trends, trend gaps), so the
// text still answers whether the firms lean differently and whether any is
// changing.
const KEEP_ONE = new Set([RANK.flag, RANK.trend, RANK.gap])
function cap(sentences) {
  const out = sentences.slice()
  while (out.length > K.MAX_SENTENCES) {
    const removable = (i) => !KEEP_ONE.has(out[i].rank) || out.filter((x) => x.rank === out[i].rank).length > 1
    let worst = -1
    for (let i = out.length - 1; i >= 0; i--) if (out[i].rank > 0 && removable(i) && (worst < 0 || out[i].rank > out[worst].rank)) worst = i
    if (worst < 0) for (let i = out.length - 1; i >= 0; i--) if (out[i].rank > 0 && (worst < 0 || out[i].rank > out[worst].rank)) worst = i
    out.splice(worst, 1)
  }
  return out.map(({ rank, ...s }) => s)
}

// selection: { firm, vs, types, allTypes } ; rows: compareFirms(...).rows
export function narrate(rows, selection) {
  for (const r of rows) r.fmt = formatRow(r)
  const R = byId(rows)
  const A = selection.firm
  const others = selection.vs
  const out = []
  // Each sentence has a rank: when there are too many, the highest ranks go
  // first, last ones first, so every firm's score sentence stays.
  const say = (text, cites, kind, rank = RANK[kind]) => out.push({ text, cites, kind, rank })
  const scoreRow = (j) => R[`score-${j}`]
  const flagRows = (j) => (selection.measures || []).map((m) => R[`flag-${m}-${j}`]).filter(Boolean)
  const trendRows = rows.filter((r) => r.kind === 'trend' && r.verdict === 'differs')
  const gapRows = rows.filter((r) => r.kind === 'trend-gap' && r.verdict === 'differs')
  const anyDiffers = rows.some((r) => r.verdict === 'differs' && r.kind !== 'pair-type') ||
    rows.some((r) => r.kind === 'pair-type' && r.verdict === 'differs')
  const where = typesPhrase(selection.types, { all: selection.allTypes })

  // Nothing passes: one sentence, with the report counts.
  if (!anyDiffers) {
    const cites = others.map((_, j) => `score-${j + 1}`)
    const nA = scoreRow(1).fmt.nA
    const nOthers = others.map((_, j) => scoreRow(j + 1).fmt.nB)
    const names = joinAnd(others)
    say(`With ${nA} ${nA === '1' ? 'report' : 'reports'} from ${A} and ${joinAnd(nOthers)} from ${names}, no difference in score, flags or trends can be told apart from chance.`, cites, 'none')
    return cap(out)
  }

  // The lead.
  const ups = [], downs = [], apart = [], few = []
  others.forEach((name, j) => {
    const r = scoreRow(j + 1)
    if (r.verdict === 'differs') (r.estimate > 0 ? ups : downs).push([name, r.id])
    else if (r.verdict === 'apart') apart.push([name, r.id])
    else few.push([name, r.id])
  })
  const poss = (xs) => joinAnd(xs.map(([n]) => possessive(n)))
  if (ups.length || downs.length) {
    const parts = []
    if (ups.length) parts.push(`higher than ${poss(ups)}`)
    if (downs.length) parts.push(`lower than ${poss(downs)}`)
    const rest = apart.length ? ` and can’t be told apart from ${joinAnd(apart.map(([n]) => possessive(n)), 'or')}` : ''
    say(`${possessive(A)} reports score ${joinAnd(parts)}${rest}.`, [...ups, ...downs, ...apart].map(([, id]) => id), 'lead')
  } else {
    const flagsDiffer = others.some((_, j) => flagRows(j + 1).some((r) => r.verdict === 'differs'))
    const told = apart.length ? apart : others.map((n, j) => [n, `score-${j + 1}`])
    say(`${possessive(A)} scores can’t be told apart from ${joinAnd(told.map(([n]) => possessive(n)), 'or')}, though ${flagsDiffer ? 'some flag rates differ' : 'some trends differ'}.`,
      told.map(([, id]) => id), 'lead')
  }

  // Each other firm.
  let firstInterval = true
  let saidApart = false, saidFew = false
  others.forEach((name, j) => {
    const r = scoreRow(j + 1)
    const f = r.fmt
    if (r.verdict === 'differs') {
      const lead = firstInterval ? `${where}, ` : ''
      say(`${lead}${possessive(A)} reports score a typical ${f.size} points ${f.dir} than ${possessive(name)} (${firstInterval ? '95% interval ' : ''}${f.lo} to ${f.hi}; ${f.nA} and ${f.nB} reports).`, [r.id], 'differs')
      firstInterval = false
    } else if (r.verdict === 'apart' && !saidApart) {
      say(`Against ${joinAnd(apart.map(([n]) => n))}, the gap can’t be told apart from chance with this many reports.`, apart.map(([, id]) => id), 'apart')
      saidApart = true
    } else if (r.verdict === 'few' && !saidFew) {
      const counts = few.map(([n, id]) => `${R[id].fmt.nB} from ${n}`)
      say(`With ${joinAnd(counts)}, there are too few reports to compare ${few.length > 1 ? 'those firms' : 'that firm'} on score.`, few.map(([, id]) => id), 'few')
      saidFew = true
    }

    // Report type accounted for, when it changes the verdict or the sign.
    const t = R[`scoretype-${j + 1}`]
    // A sign change counts only between gaps that print as more than 0.0.
    const signOf = (row) => (row.fmt.size === '0.0' ? 0 : Math.sign(row.estimate))
    const changes = t && t.estimate != null && r.estimate != null &&
      (t.verdict !== r.verdict || (signOf(t) !== 0 && signOf(r) !== 0 && signOf(t) !== signOf(r)))
    if (changes && r.verdict !== 'few') {
      const tf = t.fmt
      const m = t.mix
      // B publishes more of a type that scores on the side that explains the gap.
      if (m && Math.abs(m.gap) >= 0.1 && m.listMedian != null && m.listAll != null && m.listMedian !== m.listAll) {
        const more = m.gap > 0 ? name : A
        const typeLow = m.listMedian < m.listAll
        // A higher, B has more of a low-scoring type (or A more of a high one): the mix explains it.
        const explains = (r.estimate > 0) === (m.gap > 0 ? typeLow : !typeLow)
        if (explains) {
          say(`${more} publishes more ${typePlural(m.type)}, which score ${typeLow ? 'lower' : 'higher'} across The List.`, [t.id], 'mix', RANK.mix)
        }
      }
      if (t.verdict === 'few') {
        say(`Comparing like with like leaves too few reports of the same types (${tf.nA} and ${tf.nB}) to tell.`, [t.id], 'few', RANK.type)
      } else {
        const flips = Math.sign(t.estimate) !== Math.sign(r.estimate)
        const closes = tf.size === '0.0'
        const move = closes ? 'closes' : flips ? `reverses, to ${tf.size} points ${tf.dir}` : Math.abs(t.estimate) < Math.abs(r.estimate) ? `narrows to ${tf.size} points` : `widens to ${tf.size} points`
        const end = t.verdict === 'differs' ? 'still differs' : 'can’t be told apart from chance'
        say(`Comparing like with like, the gap ${move} (${tf.lo} to ${tf.hi}) and ${end}.`, [t.id], t.verdict === 'differs' ? 'differs' : 'apart', RANK.type)
      }
    }

    // The flags that differ, largest first.
    const differs = flagRows(j + 1).filter((x) => x.verdict === 'differs')
      .sort((a, b) => Math.abs(b.estimate) - Math.abs(a.estimate))
      .slice(0, K.FLAG_SENTENCES_PER_FIRM)
    for (const x of differs) {
      const xf = x.fmt
      const label = (n) => flagLabel(x.measure, n === '1' ? 1 : 2)
      if (x.zero) {
        const aNone = x.counts[0] === 0
        say(`For every 100 claims, ${possessive(A)} reports have ${aNone ? 'none' : `${xf.rateA} that ${label(xf.rateA)}`} and ${possessive(name)} have ${aNone ? `${xf.rateB} that ${label(xf.rateB)}` : 'none'} (${xf.size} more per 100 claims; ${xf.lo} to ${xf.hi}).`, [x.id], 'differs', RANK.flag)
      } else {
        const who = xf.more === 'A' ? possessive(A) : possessive(name)
        say(`For every 100 claims, ${possessive(A)} reports have ${xf.rateA} that ${label(xf.rateA)} and ${possessive(name)} have ${xf.rateB} (${who} ${xf.size} times as many; ${xf.lo} to ${xf.hi}).`, [x.id], 'differs', RANK.flag)
      }
    }
  })

  // Trends that pass, the chosen firm's first, then the gaps that pass.
  const unit = (m) => (m === 'score' ? 'points' : 'per 100 claims')
  for (const x of trendRows.sort((a, b) => a.firmIndex - b.firmIndex)) {
    const xf = x.fmt
    const whose = possessive(x.firm)
    const what = x.measure === 'score' ? `${whose} scores have` : `the share of ${whose} claims that ${flagLabel(x.measure, 2)} has`
    say(`Since ${xf.firstYear}, ${what} ${xf.dir} by about ${xf.size} ${unit(x.measure)} a year (${xf.lo} to ${xf.hi}).`, [x.id], 'differs', RANK.trend)
  }
  for (const x of gapRows) {
    const xf = x.fmt
    const what = x.measure === 'score' ? 'scores' : `the share of claims that ${flagLabel(x.measure, 2)}`
    say(`${possessive(x.firm)} and ${possessive(x.other)} trends in ${what} differ by about ${xf.size} ${unit(x.measure)} a year (${xf.lo} to ${xf.hi}).`, [x.id], 'differs', RANK.gap)
  }

  return cap(out)
}
