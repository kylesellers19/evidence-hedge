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

// Ranks: when there are more than MAX_SENTENCES, the highest rank goes first,
// last ones first. A firm whose score differs keeps its like-with-like
// sentence (rank 3, which also says when report-type mix is the likeliest
// reason); the last sentence of each kind of finding (flags, trends) stays,
// so the text still answers whether the firms lean differently and whether
// any is changing.
const RANK = { none: 0, lead: 0, score: 1, lean: 1, grouped: 2, type: 3, flag: 4, trend: 5, gap: 6, typeQuiet: 7 }
const KEEP_ONE = new Set([RANK.flag, RANK.trend])
function cap(sentences) {
  const out = sentences.slice()
  while (out.length > K.MAX_SENTENCES) {
    const removable = (i) => out[i].rank > RANK.type && (!KEEP_ONE.has(out[i].rank) || out.filter((x) => x.rank === out[i].rank).length > 1)
    let worst = -1
    for (let i = out.length - 1; i >= 0; i--) if (removable(i) && (worst < 0 || out[i].rank > out[worst].rank)) worst = i
    if (worst < 0) for (let i = out.length - 1; i >= 0; i--) if (out[i].rank > 0 && (worst < 0 || out[i].rank > out[worst].rank)) worst = i
    out.splice(worst, 1)
  }
  return out.map(({ rank, ...s }) => s)
}

// An interval in a sentence: "0.4 to 1.9" in the gap's direction, or, when it
// runs across no difference, "0.7 lower to 0.3 higher".
const span = (f, unit = '') => (f.crossLo != null ? `${f.crossLo}${unit} lower to ${f.crossHi}${unit} higher` : `${f.lo} to ${f.hi}${unit}`)

// selection: { firm, vs, types, measures, allTypes } ; rows: compareFirms(...).rows
export function narrate(rows, selection) {
  for (const r of rows) r.fmt = formatRow(r)
  const R = byId(rows)
  const A = selection.firm
  const others = selection.vs
  const measures = selection.measures || []
  const out = []
  const say = (text, cites, kind, rank) => out.push({ text, cites, kind, rank })
  const scoreRow = (j) => R[`score-${j}`]
  const flagRows = (j) => measures.map((m) => R[`flag-${m}-${j}`]).filter(Boolean)
  const trendRows = rows.filter((r) => r.kind === 'trend' && r.verdict === 'differs')
  const gapRows = rows.filter((r) => r.kind === 'trend-gap' && r.verdict === 'differs')
  const anyDiffers = rows.some((r) => r.verdict === 'differs')
  const where = typesPhrase(selection.types, { all: selection.allTypes })

  // Nothing passes: one sentence, with the report counts.
  if (!anyDiffers) {
    const cites = others.map((_, j) => `score-${j + 1}`)
    const nA = scoreRow(1).fmt.nA
    const nOthers = others.map((_, j) => scoreRow(j + 1).fmt.nB)
    say(`With ${nA} ${nA === '1' ? 'report' : 'reports'} from ${A} and ${joinAnd(nOthers)} from ${joinAnd(others)}, no difference in score, flags or trends can be told apart from chance.`, cites, 'none', RANK.none)
    return cap(out)
  }

  // The lead.
  let saidFew = false
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
    say(`${where}, ${possessive(A)} reports score ${joinAnd(parts)}${rest}.`, [...ups, ...downs, ...apart].map(([, id]) => id), 'lead', RANK.lead)
  } else {
    // No score differs. Say what does: flag rates, or a gap between two firms'
    // trends, or one firm's own trend (never as a difference between firms).
    const flagsDiffer = rows.some((r) => (r.kind === 'pair' || r.kind === 'pair-type') && r.measure !== 'score' && r.verdict === 'differs')
    const gapsDiffer = gapRows.length > 0
    const changed = trendRows.map((r) => r.firm).filter((n, i, xs) => xs.indexOf(n) === i)
    const though = flagsDiffer ? 'though some flag rates differ' : gapsDiffer ? 'though their trends differ' : `though ${joinAnd(changed.map(possessive))} reports have changed over time`
    if (apart.length) {
      say(`${where}, ${possessive(A)} scores can’t be told apart from ${joinAnd(apart.map(([n]) => possessive(n)), 'or')}, ${though}.`, apart.map(([, id]) => id), 'lead', RANK.lead)
    } else {
      say(`${where}, there are too few reports to compare ${possessive(A)} scores with ${joinAnd(few.map(([n]) => possessive(n)))}, ${though}.`, few.map(([, id]) => id), 'lead', RANK.lead)
      saidFew = true
    }
  }

  // Which flag each firm's writing leans toward: its most common one.
  {
    const top = []
    const firms = [A, ...others]
    firms.forEach((name, i) => {
      const j = i === 0 ? 1 : i
      const rates = measures.map((m) => { const x = R[`flag-${m}-${j}`]; return { m, id: x?.id, v: i === 0 ? x?.rateA : x?.rateB, f: i === 0 ? x?.fmt.rateA : x?.fmt.rateB } })
        .filter((x) => x.v != null)
      if (rates.length) top.push({ name, ...rates.sort((a, b) => b.v - a.v)[0] })
    })
    if (top.length === firms.length) {
      const flags = [...new Set(top.map((t) => t.m))]
      if (flags.length === 1) {
        const vs = top.map((t) => t.v)
        const lo = top[vs.indexOf(Math.min(...vs))].f, hi = top[vs.indexOf(Math.max(...vs))].f
        say(`The most common flag in every firm’s reports is a claim that ${flagLabel(flags[0], 1)}: ${lo === hi ? lo : `${lo} to ${hi}`} in every 100 claims.`,
          [...new Set(top.map((t) => t.id))], 'lean', RANK.lean)
      } else {
        const groups = flags.map((m) => `${joinAnd(top.filter((t) => t.m === m).map((t) => possessive(t.name)))} reports most often have claims that ${flagLabel(m, 2)}`)
        const text = groups.join('; ')
        say(`${text.charAt(0).toUpperCase()}${text.slice(1)}.`, [...new Set(top.map((t) => t.id))], 'lean', RANK.lean)
      }
    }
  }

  // Each other firm.
  let firstInterval = true
  let saidApart = false
  others.forEach((name, j) => {
    const r = scoreRow(j + 1)
    const f = r.fmt
    if (r.verdict === 'differs') {
      say(`${possessive(A)} reports score a typical ${f.size} points ${f.dir} than ${possessive(name)} (${firstInterval ? '95% interval ' : ''}${f.lo} to ${f.hi}; ${f.nA} and ${f.nB} reports).`, [r.id], 'differs', RANK.score)
      firstInterval = false
    } else if (r.verdict === 'apart' && !saidApart && !ups.length && !downs.length) {
      // (When some firm differs, the lead already names these.)
      say(`Against ${joinAnd(apart.map(([n]) => n))}, the gap can’t be told apart from chance with this many reports.`, apart.map(([, id]) => id), 'apart', RANK.grouped)
      saidApart = true
    } else if (r.verdict === 'few' && !saidFew) {
      const counts = few.map(([n, id]) => `${R[id].fmt.nB} from ${n}`)
      say(`With ${joinAnd(counts)}, there are too few reports to compare ${few.length > 1 ? 'those firms' : 'that firm'} on score.`, few.map(([, id]) => id), 'few', RANK.grouped)
      saidFew = true
    }

    // Report type accounted for, when it changes the verdict or the sign; with
    // the type mix first, when it is the likeliest reason for the gap.
    const t = R[`scoretype-${j + 1}`]
    const signOf = (row) => (row.fmt.size === '0.0' ? 0 : Math.sign(row.estimate))
    const changes = t && t.estimate != null && r.estimate != null &&
      (t.verdict !== r.verdict || (signOf(t) !== 0 && signOf(r) !== 0 && signOf(t) !== signOf(r)))
    if (changes && r.verdict !== 'few') {
      const tf = t.fmt
      const m = t.mix
      let why = ''
      if (m && Math.abs(m.gap) >= 0.1 && m.listMedian != null && m.listAll != null && m.listMedian !== m.listAll) {
        const more = m.gap > 0 ? name : A
        const typeLow = m.listMedian < m.listAll
        const explains = (r.estimate > 0) === (m.gap > 0 ? typeLow : !typeLow)
        if (explains) why = `${more} publishes more ${typePlural(m.type)}, which score ${typeLow ? 'lower' : 'higher'} across The List; `
      }
      const like = why ? 'comparing like with like' : 'Comparing like with like'
      const rank = r.verdict === 'differs' ? RANK.type : RANK.typeQuiet
      if (t.verdict === 'few') {
        say(`${why}${like} leaves too few reports of the same types (${tf.nA} and ${tf.nB}) to tell.`, [t.id], 'few', rank)
      } else if (t.verdict === 'differs') {
        say(`${why}${like}, ${possessive(A)} reports still score ${tf.size} points ${tf.dir} (${tf.lo} to ${tf.hi}; ${tf.nA} and ${tf.nB} reports).`, [t.id], 'differs', rank)
      } else {
        // No direction claimed for a gap that can't be told apart.
        say(`${why}${like}, the gap can’t be told apart from chance (${span(tf, ' points')}; ${tf.nA} and ${tf.nB} reports).`, [t.id], 'apart', rank)
      }
    }

    // The flags that differ, largest first, each checked like with like.
    const differs = flagRows(j + 1).filter((x) => x.verdict === 'differs')
      .sort((a, b) => Math.abs(b.estimate) - Math.abs(a.estimate))
      .slice(0, K.FLAG_SENTENCES_PER_FIRM)
    for (const x of differs) {
      const xf = x.fmt
      const label = (n) => flagLabel(x.measure, n === '1' ? 1 : 2)
      const xt = R[`flagtype-${x.measure}-${j + 1}`]
      const tail = !xt || xt.verdict === 'differs' ? ''
        : xt.verdict === 'few' ? ', with too few reports of the same types to check it type by type'
        : ', though not once report type is accounted for'
      const cites = xt && xt.verdict !== 'differs' ? [x.id, xt.id] : [x.id]
      if (x.zero) {
        const aNone = x.counts[0] === 0
        say(`For every 100 claims, ${possessive(A)} reports have ${aNone ? 'none' : `${xf.rateA} that ${label(xf.rateA)}`} and ${possessive(name)} have ${aNone ? `${xf.rateB} that ${label(xf.rateB)}` : 'none'} (${xf.size} more per 100 claims; ${xf.lo} to ${xf.hi})${tail}.`, cites, 'differs', RANK.flag)
      } else {
        const who = xf.more === 'A' ? possessive(A) : possessive(name)
        say(`For every 100 claims, ${possessive(A)} reports have ${xf.rateA} that ${label(xf.rateA)} and ${possessive(name)} have ${xf.rateB} (${who} ${xf.size} times as many; ${xf.lo} to ${xf.hi})${tail}.`, cites, 'differs', RANK.flag)
      }
    }
  })

  // Trends that pass, the chosen firm's first, then the gaps that pass. A
  // trend is given over the years its reports span, with how many.
  const unit = (m) => (m === 'score' ? 'points' : 'per 100 claims')
  for (const x of trendRows.sort((a, b) => a.firmIndex - b.firmIndex)) {
    const xf = x.fmt
    const whose = possessive(x.firm)
    const what = x.measure === 'score' ? `${whose} scores` : `the share of ${whose} claims that ${flagLabel(x.measure, 2)}`
    say(`From ${xf.firstYear} to ${xf.lastYear}, ${what} ${xf.dir === 'risen' ? 'rose' : 'fell'} about ${xf.size} ${unit(x.measure)} a year (${xf.lo} to ${xf.hi}; ${xf.nA} dated reports).`, [x.id], 'differs', RANK.trend)
  }
  for (const x of gapRows) {
    const xf = x.fmt
    const what = x.measure === 'score' ? `${possessive(x.firm)} scores trend` : `The share of ${possessive(x.firm)} claims that ${flagLabel(x.measure, 2)} trends`
    say(`${what} ${xf.size} ${unit(x.measure)} a year ${xf.dir === 'risen' ? 'higher' : 'lower'} than ${possessive(x.other)} (${xf.lo} to ${xf.hi}).`, [x.id], 'differs', RANK.gap)
  }

  return cap(out)
}
