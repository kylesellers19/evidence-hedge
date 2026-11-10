import React from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import PatternSection from '../components/results/PatternSection.jsx'
import DistributionBar from '../components/results/DistributionBar.jsx'
import DocumentSignals from '../components/results/DocumentSignals.jsx'
import DocumentProfile from '../components/results/DocumentProfile.jsx'
import JudgmentBasis from '../components/results/JudgmentBasis.jsx'
import { getRubric } from '../rubrics/index.js'
import { ENGINE_VERSION } from '../engine/version.js'
import RubricProvenance from '../components/results/RubricProvenance.jsx'
import VerdictMark from '../components/results/VerdictMark.jsx'
import AddToList from '../components/results/AddToList.jsx'
import EvidenceSection from '../components/results/EvidenceSection.jsx'
import { briefTop, statsLabels, scoreParts, METHOD, ANCHORS, standardAnchor } from '../components/results/briefTop.js'

// The one-page evidence brief — a standalone editorial report, three layers
// top to bottom, serving three readers at once (with how it was judged — the
// genre reading and the standard it set — between the verdict and the profile):
//   1. Verdict       — plain-language, Source Serif display headline, then
//                      the evidence section: what each claim stands on
//   2. Patterns      — named patterns + verbatim examples (the heart)
//   3. Distribution  — the structural ladder view, understated (the analyst)
// Shares the global token source: blue accent, hairline rules, mono figures.
export default function ResultsPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  if (!state.result) return <Navigate to="/" replace />

  const { result, rubric, reading } = state
  // A hybrid's ladder, hue and noun come from its standard (rubrics/hybrids.js).
  const standard = getRubric(rubric.base || rubric.id)
  const { summary, patterns, signals } = result
  // Every string at the top of the brief, from the confirmed rubric (briefTop.js).
  const top = briefTop(result, rubric)
  const st = top.stats
  const parts = scoreParts(result)
  const L = statsLabels(st)
  const toMethod = (anchor) => `${METHOD}#${anchor}`

  const onNew = () => {
    dispatch({ type: 'RESET' })
    navigate('/')
  }

  return (
    <main className="max-w-brief mx-auto px-6 py-12 page-enter">
      {/* Masthead */}
      <button
        onClick={onNew}
        className="font-sans text-xs text-muted hover:text-gray-900 transition-colors mb-6"
      >
        ← New document
      </button>

      {/* ── Verdict mark — the top layer: the quality-encoding sphere ────── */}
      {result.documentScore && (
        <VerdictMark score={result.documentScore} rubricId={standard.id} />
      )}

      {/* ── Kicker, then the title block: what it was read as and the standard
          it was held to, once, each linked to its definition. After a drawing's
          title block (labeled cells under a hairline) and a rating action's
          header (the rating, its basis, a link to the definitions). ──────── */}
      <p className="label-tag">{top.kicker}</p>
      <dl className="eh-titleblock">
        <div>
          <dt>Read as</dt>
          <dd><Link to={toMethod(ANCHORS.readAs)}>{top.readAs}</Link></dd>
        </div>
        <div>
          <dt>Held to</dt>
          <dd><Link to={toMethod(standardAnchor(standard.id))}>{top.heldTo}</Link></dd>
        </div>
      </dl>

      {/* ── Layer 1: Verdict — one sentence; the counts sit in the row under it ── */}
      <h1 className="font-serif text-3xl sm:text-4xl font-medium leading-tight tracking-tight text-gray-900 mt-5">
        {top.headline}
      </h1>
      {top.dek && <p className="eh-brief-dek">{top.dek}</p>}
      <div className="eh-stats">
        <p className="eh-stats-row">
          <span><b>{st.claims}</b> <Link to={toMethod(L.claims[1])}>{L.claims[0]}</Link></span>
          <span><b>{st.strong}</b> <Link to={toMethod(L.strong[1])}>{L.strong[0]}</Link></span>
          <span><b>{st.flagged}</b> <Link to={toMethod(L.flagged[1])}>{L.flagged[0]}</Link></span>
        </p>
        {st.flagged > 0 && (
          <p className="eh-stats-note">
            Of the {st.flagged} flagged,{' '}
            {[
              st.unsupported > 0 && ['unsupported', st.unsupported],
              st.overconfident > 0 && ['overconfident', st.overconfident],
              st.overreach > 0 && ['overreach', st.overreach],
            ].filter(Boolean).map(([k, n], i, all) => (
              <React.Fragment key={k}>
                {i > 0 && (i === all.length - 1 ? ' and ' : ', ')}
                {n} <Link to={toMethod(L[k][1])}>{L[k][0]}</Link>
              </React.Fragment>
            ))}
            {st.twoFlags > 0 && <> ({st.twoFlags} {st.twoFlags === 1 ? 'claim has' : 'claims have'} two flags)</>}.
          </p>
        )}
        {parts && (
          <p className="eh-stats-note">
            {parts.holding} of {parts.claims} claims <Link to={toMethod(ANCHORS.scale)}>hold</Link>, which gives{' '}
            {Number.isInteger(parts.base) ? `${parts.base}.0` : parts.base} of 10
            {parts.less ? `, less ${parts.less} for ${parts.less === 1 ? 'a problem' : 'problems'} with the document as a whole` : ''}
            {parts.floored ? '; the scale stops at 1' : ''}.
          </p>
        )}
      </div>

      <hr className="brief-rule" />

      {/* ── Evidence section — what each claim stands on (docs/evidence-section.md) ── */}
      {result.claims?.length > 0 && (
        <>
          <EvidenceSection key={result.claims.length + ':' + (result.claims[0]?.text || '')} result={result} rubric={rubric} pages={state.meta?.pages || null} />
          <hr className="brief-rule" />
        </>
      )}

      {/* ── How it was judged — genre roles, standard, added audits ───────── */}
      {result.profile?.genre && (
        <>
          <JudgmentBasis rubric={rubric} profile={result.profile} reading={reading} />
          <hr className="brief-rule" />
        </>
      )}

      {/* ── Document profile — provenance, design and its ceiling ─────────── */}
      {result.profile && (
        <>
          <DocumentProfile profile={result.profile} referenceCount={result.references?.length || 0} />
          <hr className="brief-rule" />
        </>
      )}

      {/* ── Document signals — a layer of their own, above per-claim patterns ── */}
      <DocumentSignals signals={signals || []} />

      <hr className="brief-rule" />

      {/* ── Layer 2: Named patterns (the heart) ──────────────────────────── */}
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="label-tag">Patterns found</h2>
        <span className="label-tag text-gray-400">
          {patterns.length} {patterns.length === 1 ? 'pattern' : 'patterns'}
        </span>
      </div>

      {patterns.length > 0 ? (
        patterns.map(p => <PatternSection key={p.key} pattern={p} />)
      ) : (
        <p className="text-sm text-muted leading-relaxed">
          No confidence-evidence mismatches surfaced. Every strong claim was backed in
          proportion to its certainty, by this rubric's standard.
        </p>
      )}

      <hr className="brief-rule" />

      {/* ── Layer 3: Evidence-hierarchy distribution (understated) ───────── */}
      <h2 className="label-tag mb-4">Evidence distribution</h2>
      <DistributionBar distribution={summary.distribution} />
      <p className="text-[11px] text-gray-400 mt-4 leading-relaxed max-w-prose">
        How this document's claims spread across the {standard.label.toLowerCase()} ladder,
        strongest evidence to unsourced.
      </p>

      {/* ── Add to The List — only when The List is live ─────────────────── */}
      <AddToList text={state.document} meta={state.meta} result={result} />

      {/* ── Rubric provenance — always visible footer ────────────────────── */}
      <RubricProvenance provenance={rubric.provenance} rubricLabel={rubric.label} />
      <p className="font-mono text-[11px] text-gray-400 mt-10">Engine {ENGINE_VERSION}</p>
    </main>
  )
}
