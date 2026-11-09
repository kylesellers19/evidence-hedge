import React, { useMemo, useRef, useState } from 'react'
import { buildEvidenceMap, provenanceOf, noteOf, ATTRIBUTION_LABELS } from '../../engine/evidenceMap.js'
import '../../styles/evidence-map.css'

// What each claim stands on: the lead figure of the evidence brief. It reads
// left to right, From → Via → To: a source, the citation the text reaches it
// by, and the claims that lean on it, placed by how sure each sentence sounds.
// The rule from a source runs as far as that source can carry a claim (its
// reach under the standard) and stops at a tick; a blue square is a claim
// stated past it. Picking a source lists what it carries; picking a claim
// writes out its chain. Read-only: built from the analysis
// (engine/evidenceMap.js), it moves no flag, signal or score.

const markState = (c) => (c.judgment === 'outruns' ? 'outruns' : c.judgment === 'overreach' ? 'overreach' : c.tier.weight > c.ceiling ? 'unjudged' : 'within')
const MARK_WORDS = { outruns: 'stated past its reach', overreach: 'more cause or firmer advice than the design licenses', unjudged: 'past its reach, not judged', within: 'within reach' }
const pct = (w) => `${(w / 4) * 100}%`
// The mark a phone has room for: "[12]" stays, "(Zeitzer 2000)" becomes "( )".
const shortMark = (m) => (m.length <= 5 ? m : m.startsWith('[') ? '[n]' : /\(/.test(m) ? '( )' : /^[“"]/.test(m) ? '“ ”' : m.slice(0, 4))
const LIST_MAX = 12

export default function EvidenceMap({ result, rubric, standardLabel }) {
  const map = useMemo(() => buildEvidenceMap(result, rubric), [result, rubric])
  const standard = standardLabel || rubric.label
  // Arrow-key order: rows top to bottom, claims in document order within a row.
  const flat = useMemo(() => map.rows.flatMap((r) => r.claims), [map])
  const rowOfClaim = useMemo(() => Object.fromEntries(map.rows.flatMap((r) => r.claims.map((i) => [i, r.id]))), [map])
  const past = useMemo(() => map.claims.filter((c) => c.judgment === 'outruns').map((c) => c.index), [map])
  const [focus, setFocus] = useState({ type: 'claim', id: map.lead })
  const [listAll, setListAll] = useState(false)
  const marks = useRef(new Map())
  if (!map.claims.length) return null

  const sel = focus.type === 'claim' ? (map.claims[focus.id] || map.claims[map.lead]) : null
  const activeRow = focus.type === 'row' ? focus.id : rowOfClaim[sel.index]
  const row = map.rows.find((r) => r.id === activeRow)
  const pickClaim = (i, move = false) => {
    setFocus({ type: 'claim', id: i })
    if (move) marks.current.get(i)?.focus()
  }
  const pickRow = (id) => { setFocus({ type: 'row', id }); setListAll(false) }

  const onKey = (e) => {
    if (!e.target.classList.contains('em-sq')) return
    const at = flat.indexOf(Number(e.target.dataset.i))
    const rowIdx = map.rows.findIndex((r) => r.claims.includes(flat[at]))
    const go = (k) => { e.preventDefault(); pickClaim(flat[Math.max(0, Math.min(flat.length - 1, k))], true) }
    if (e.key === 'ArrowRight') go(at + 1)
    else if (e.key === 'ArrowLeft') go(at - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(flat.length - 1)
    else if (e.key === 'ArrowDown' && rowIdx < map.rows.length - 1) { e.preventDefault(); pickClaim(map.rows[rowIdx + 1].claims[0], true) }
    else if (e.key === 'ArrowUp' && rowIdx > 0) { e.preventDefault(); pickClaim(map.rows[rowIdx - 1].claims[0], true) }
  }

  const tierName = (w) => map.tiers.find((t) => t.weight === w)?.label || ''
  const cues = (t) => {
    // Two cue words with different stems ("prove, conclusively", not "prove, proves").
    const words = []
    for (const w of rubric.tiers.find((x) => x.key === t.key)?.cues || []) {
      if (!w.includes(' ') && !words.some((x) => x.slice(0, 3) === w.slice(0, 3))) words.push(w)
      if (words.length === 2) break
    }
    return words.length ? words.join(', ') : 'said plainly'
  }

  // The pager walks the claims stated past their reach, in document order.
  const walk = past.length ? past : map.claims.map((c) => c.index)
  const step = (d) => {
    const here = sel ? walk.indexOf(sel.index) : -1
    const next = here === -1 ? walk[0] : walk[(here + d + walk.length) % walk.length]
    pickClaim(next)
  }

  return (
    <section className="em" aria-labelledby="em-title">
      <h2 id="em-title" className="em-title">What each claim stands on</h2>
      <p className="em-dek">{map.dek}</p>

      <figure className="em-figure">
        <div className="em-grid em-colheads">
          <span className="em-colhead em-colhead-from">From</span>
          <span className="em-colhead em-colhead-via">Via</span>
          <div className="em-col-to">
            <span className="em-colhead">To the claim, by how sure it sounds</span>
            <div className="em-tiers">
              {map.tiers.map((t) => <span key={t.key} className="em-tier"><b>{t.label}</b><i>{cues(t)}</i></span>)}
            </div>
          </div>
        </div>

        <div className="em-rows" data-focus={focus.type} onKeyDown={onKey}>
          {map.rows.map((r, ri) => {
            const active = r.id === activeRow
            const hasNext = map.rows[ri + 1]?.continued
            const gapTo = Math.max(...r.claims.map((i) => map.claims[i]).filter((c) => markState(c) === 'outruns').map((c) => c.tier.weight), 0)
            return (
              <div key={r.id} className={`em-row em-grid${hasNext ? ' has-next' : ''}`} data-grade={r.grade} data-continued={r.continued} data-active={active}>
                <button type="button" className="em-from" aria-pressed={focus.type === 'row' && active} onClick={() => pickRow(r.id)}
                  aria-label={`${r.continued ? 'Same source' : r.label}: ${r.claims.length} ${r.claims.length === 1 ? 'claim' : 'claims'}, reach ${r.reach}, ${r.outruns} stated past it`}>
                  <span className="em-from-line">
                    {r.continued ? <span className="em-ditto" aria-hidden="true">″</span> : <span className="em-src">{r.label}</span>}
                    <span className="em-n">{r.claims.length}</span>
                    <span className="em-line" aria-hidden="true" />
                  </span>
                  <span className="em-sub">{r.sub}</span>
                </button>
                <div className="em-via" aria-hidden="true">
                  <span className="em-line" />
                  {r.via && (() => {
                    const mark = r.via.quoted ? `“${r.via.mark.replace(/^[“"]|[”"]$/g, '')}”` : r.via.mark
                    return (
                      <span className={`em-via-mark${r.via.quoted ? ' is-quoted' : ''}`} title={r.via.word || undefined}>
                        <span className="em-via-long">{mark}</span><span className="em-via-short">{shortMark(mark)}</span>
                      </span>
                    )
                  })()}
                  <span className="em-line" />
                </div>
                <div className="em-to">
                  <span className="em-reach" style={{ width: pct(r.ceiling) }} aria-hidden="true" />
                  {gapTo > r.ceiling && <span className="em-gap" style={{ left: pct(r.ceiling), width: `calc(${pct(gapTo - r.ceiling)} - 8px)` }} aria-hidden="true" />}
                  {active && (
                    <>
                      <span className="em-dim-text" style={{ right: `calc(100% - ${pct(r.ceiling)} + 6px)` }}>reaches {tierName(r.ceiling).toLowerCase()}</span>
                      {gapTo > r.ceiling && <span className="em-dim-text is-gap" style={{ left: `calc(${pct(r.ceiling)} + 8px)` }}>{r.outruns} past it</span>}
                    </>
                  )}
                  <div className="em-bands">
                    {map.tiers.map((t) => (
                      <div key={t.key} className="em-band">
                        {r.claims.filter((i) => map.claims[i].tier.weight === t.weight).map((i) => {
                          const c = map.claims[i]
                          const on = sel && sel.index === i
                          return (
                            <button key={i} type="button" className="em-sq" data-i={i} data-j={markState(c)}
                              ref={(el) => { if (el) marks.current.set(i, el); else marks.current.delete(i) }}
                              aria-pressed={!!on} tabIndex={on || (!sel && i === flat[0]) ? 0 : -1}
                              aria-label={`Claim ${i + 1}, ${c.tier.label.toLowerCase()}, ${MARK_WORDS[markState(c)]}`}
                              onClick={() => pickClaim(i)} />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <figcaption className="em-legend">
          Read each row left to right: a source, the citation the text reaches it by, and the claims that lean on it, placed by how sure each sentence sounds.
          The rule runs as far as that source can carry a claim under the {standard.toLowerCase()} standard, then stops at a tick.
          It is solid <span className="em-key" aria-label="solid rule" /> when the citation resolves, dashed <span className="em-key is-loose" aria-label="dashed rule" /> when
          the source is named or inferred but not linked, and dotted <span className="em-key is-presumed" aria-label="dotted rule" /> when the text appeals to research it doesn’t name.
          A blue square <span className="em-key-sq" aria-hidden="true" /> is stated past the end of its rule; a blue outline <span className="em-key-sq is-overreach" aria-hidden="true" /> claims
          more cause, or gives firmer advice, than the study design licenses; an open square <span className="em-key-sq is-unjudged" aria-hidden="true" /> is past it but hedged, or describes a method.
        </figcaption>
      </figure>

      <div className="em-panel" aria-live="polite">
        {sel ? <ClaimPanel c={sel} map={map} standard={standard} tierName={tierName} /> : (
          <RowPanel row={row} map={map} standard={standard} tierName={tierName} listAll={listAll} onMore={() => setListAll(true)} onPick={pickClaim} />
        )}
        <div className="em-pager">
          <button type="button" aria-label="Previous claim" onClick={() => step(-1)}>‹</button>
          <span>
            {sel && walk.includes(sel.index) ? `${walk.indexOf(sel.index) + 1} of ${walk.length}` : `${walk.length}`}{' '}
            {past.length ? (walk.length === 1 ? 'claim stated past its reach' : 'claims stated past their reach') : 'claims'}
          </span>
          <button type="button" aria-label="Next claim" onClick={() => step(1)}>›</button>
        </div>
      </div>
    </section>
  )
}

function ClaimPanel({ c, map, standard, tierName }) {
  const steps = c.tier.weight - c.ceiling
  const isPast = c.judgment === 'outruns'
  const row = map.rows.find((r) => r.claims.includes(c.index))
  const note = noteOf(c)
  return (
    <>
      <p className="em-quote"><span className="em-runin">Claim {c.index + 1}.</span> “{c.text}”</p>
      <p className={`em-prov${isPast ? ' is-past' : ''}`}>{provenanceOf(c, map.rows, standard, map.tiers)}</p>
      <dl className="em-block">
        <div className="em-cell"><dt>Stated as</dt><dd>{c.tier.label}</dd></div>
        <div className="em-cell"><dt>Its source reaches</dt><dd>{tierName(c.ceiling)}</dd></div>
        <div className="em-cell"><dt>Past its reach</dt><dd className={isPast ? 'is-past' : ''}>{steps > 0 ? `${steps} ${steps === 1 ? 'step' : 'steps'}` : 'No'}</dd></div>
        <div className="em-cell"><dt>Whose finding</dt><dd>{ATTRIBUTION_LABELS[c.attribution.label] || c.attribution.label}</dd></div>
      </dl>
      {c.kind === 'reference' && c.targetSpan && <p className="em-entry"><span className="em-runin">{row?.label}.</span> {c.targetSpan}</p>}
      {note && <p className="em-note">† {note}</p>}
    </>
  )
}

function RowPanel({ row, map, standard, tierName, listAll, onMore, onPick }) {
  const claims = row.claims.map((i) => map.claims[i]).sort((a, b) => (b.judgment === 'outruns') - (a.judgment === 'outruns') || b.tier.weight - a.tier.weight || a.index - b.index)
  const shown = listAll ? claims : claims.slice(0, LIST_MAX)
  return (
    <>
      <p className="em-quote"><span className="em-runin">{row.continued ? 'The same source.' : `${row.label}.`}</span> {row.sub.charAt(0).toUpperCase() + row.sub.slice(1)}.</p>
      <p className="em-prov">
        It carries {row.claims.length === 1 ? 'one claim' : `${row.claims.length} claims`}, and reaches {tierName(row.ceiling).toLowerCase()} under the {standard.toLowerCase()} standard
        {row.outruns ? `; ${row.outruns} ${row.outruns === 1 ? 'is' : 'are'} stated past that.` : '; none is stated past that.'}
      </p>
      <ol className="em-list">
        {shown.map((c) => (
          <li key={c.index}>
            <button type="button" onClick={() => onPick(c.index)}>
              <span className="em-sq" data-j={markState(c)} aria-hidden="true" />
              <span>{c.text.length > 160 ? `${c.text.slice(0, 159).trimEnd()}…` : c.text}</span>
              <span>{c.tier.label}</span>
            </button>
          </li>
        ))}
      </ol>
      {claims.length > shown.length && <button type="button" className="em-more" onClick={onMore}>Show the other {claims.length - shown.length}</button>}
    </>
  )
}
