// ─────────────────────────────────────────────────────────────────────────────
// The top of the evidence brief, as values. ResultsPage renders them and the
// corpus audit records them (checks/lib/brief-top.mjs), so a template change
// shows on every document.
//
// One value sets how the document was read and the standard it was held to:
// the confirmed rubric (a genre's own, or a hybrid composed in
// rubrics/hybrids.js). "Read as" is the hybrid scenario's name, or the
// single genre's reading for its posture; "Held to" is the standard's name;
// the headline and the verdict box name the same rubric's documentNoun. The
// line under the headline is advice only and never names a standard.
//
// Every number links to its definition on the Method page.
// PROVISIONAL — not ratified (labels, anchors, the reconciling lines).
// ─────────────────────────────────────────────────────────────────────────────

import { getRubric } from '../../rubrics/index.js'
import { READ_AS } from '../../engine/scoreDocument.js'

export const METHOD = '/method'
export const scoreAnchor = (display) => `score-${display}`
export const standardAnchor = (id) => `standard-${id}`

// Method anchors for every count label, flag type and document signal.
export const ANCHORS = {
  readAs: 'read-as',
  claims: 'claims-weighed',
  strong: 'read-as-strong',
  flagged: 'flagged',
  strictest: 'strictest-setting',
  flag: (key) => `flag-${key}`,
  signal: (id) => `signal-${id}`,
}

const plural = (n, one, many) => (n === 1 ? one : many)

/** What the document was read as and the standard it was held to. */
export function readingOf(rubric, posture) {
  const standard = getRubric(rubric.base || rubric.id)
  return {
    readAs: rubric.hybrid ? rubric.readAs : READ_AS[posture] || standard.label,
    heldTo: `The ${standard.label.toLowerCase()} standard${rubric.stub ? ', still a draft' : ''}`,
    standardId: standard.id,
    noun: rubric.documentNoun || 'document',
  }
}

/**
 * The stats row. `flagged` counts claims with any flag once; a claim can be
 * both unsupported (or overconfident) and an overreach, so
 * unsupported + overconfident + overreach − twoFlags = flagged.
 * `strictFlagged` is set when the score, which reads every claim at the
 * standard's strictest setting, counted a different number than the brief
 * shows at the document's own setting.
 */
export function statsOf(result) {
  const s = result.summary
  const fc = s.flagCounts
  const b = result.documentScore?.breakdown
  const shown = fc['unsupported-assertion'] + fc.overconfident
  const strict = b && !b.gate && !b.unscored && b.flaggedAtStandard != null && b.flaggedAtStandard !== shown ? b.flaggedAtStandard : null
  return {
    claims: s.totalClaims,
    strong: s.strongClaims,
    flagged: s.flaggedClaims,
    unsupported: fc['unsupported-assertion'],
    overconfident: fc.overconfident,
    overreach: fc['causal-overreach'] || 0,
    twoFlags: (result.claims || []).filter((c) => c.flag && c.overreach).length,
    strictFlagged: strict,
  }
}

/** The stats row's labels, with the Method anchor each links to. */
export function statsLabels(st) {
  return {
    claims: [plural(st.claims, 'claim weighed', 'claims weighed'), ANCHORS.claims],
    strong: ['read as strong', ANCHORS.strong],
    flagged: ['flagged', ANCHORS.flagged],
    unsupported: [plural(st.unsupported, 'cites nothing', 'cite nothing'), ANCHORS.flag('unsupported-assertion')],
    overconfident: [plural(st.overconfident, 'cites too little', 'cite too little'), ANCHORS.flag('overconfident')],
    overreach: [plural(st.overreach, 'claims more cause than the study shows', 'claim more cause than the study shows'), ANCHORS.flag('causal-overreach')],
  }
}

/** The line under the stats row, as text (the page renders it with links). */
export function breakdownText(st) {
  if (!st.flagged) return null
  const L = statsLabels(st)
  const parts = [
    st.unsupported && `${st.unsupported} ${L.unsupported[0]}`,
    st.overconfident && `${st.overconfident} ${L.overconfident[0]}`,
    st.overreach && `${st.overreach} ${L.overreach[0]}`,
  ].filter(Boolean)
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
  const two = st.twoFlags ? ` (${st.twoFlags} ${plural(st.twoFlags, 'claim has', 'claims have')} two flags)` : ''
  return `Of the ${st.flagged} flagged, ${list}${two}.`
}

/** When the score counted at a stricter setting than the brief shows. */
export function strictText(st) {
  if (st.strictFlagged == null) return null
  return `For the score, every claim is held to the strictest setting, where ${st.strictFlagged} of ${st.claims} cite nothing or too little.`
}

/** Every string at the top of the brief, as the page shows it. */
export function briefTop(result, rubric) {
  const reading = readingOf(rubric, result.posture)
  const s = result.documentScore
  const st = statsOf(result)
  return {
    kicker: 'Evidence brief',
    readAs: reading.readAs,
    heldTo: reading.heldTo,
    headline: result.summary.verdict,
    dek: s?.genreNote || null,
    verdictBox: { score: s && s.score != null ? `${s.display} / 10` : 'No score', summary: s?.summary || null, href: s && s.score != null ? `${METHOD}#${scoreAnchor(s.display)}` : null },
    stats: st,
    breakdown: breakdownText(st),
    strict: strictText(st),
  }
}
