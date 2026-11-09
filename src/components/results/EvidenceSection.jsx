import React, { useMemo, useState } from 'react'
import { buildEvidenceSection, VERDICTS } from '../../engine/evidenceSection.js'
import '../../styles/evidence-section.css'

// What each claim stands on: the brief's evidence section (docs/evidence-section.md).
// Four questions, in the order a reader asks them: how much of this stands on
// anything (the bar), which claims to check first, where they are, and what
// the claims lean on. Every label sits on or beside the mark it names.
// Read-only: built from the analysis (engine/evidenceSection.js).

const SHOW_MORE = 3
const LIST_STEP = 20
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const needLine = (n) => `${n} ${n === 1 ? 'needs' : 'need'} checking`

// A claim's text with the words that make it firm underlined.
function Quote({ c, marks = true }) {
  if (!marks || !c.underline.length) return <>“{c.text}”</>
  const parts = []
  let at = 0
  c.underline.forEach(([a, b], k) => {
    parts.push(c.text.slice(at, a))
    parts.push(<u key={k}>{c.text.slice(a, b)}</u>)
    at = b
  })
  parts.push(c.text.slice(at))
  return <>“{parts}”</>
}

function Example({ c }) {
  return (
    <p className="es-ex">
      <Quote c={c} marks={false} />
      <span className={c.needs ? 'is-needs' : ''}>{c.reason}</span>
    </p>
  )
}

// Labels under the bar: a wide segment's label sits under its start; a narrow
// one drops to the next line on a tick, right-aligned near the end.
const LABEL_W = 26 // % of the bar a label takes, for collisions
function placeLabels(segs) {
  const lines = []
  return segs.map((s) => {
    const right = s.at > 100 - LABEL_W - 4
    const from = right ? s.at + s.w - LABEL_W : s.at
    let line = s.w >= 18 ? 0 : 1
    while ((lines[line] || []).some(([a, b]) => from < b && from + LABEL_W > a)) line++
    ;(lines[line] ||= []).push([from, from + LABEL_W])
    return { ...s, line, right, tick: line > 0 }
  })
}

export default function EvidenceSection({ result, rubric, pages }) {
  const s = useMemo(() => buildEvidenceSection(result, rubric, { pages }), [result, rubric, pages])
  const [shown, setShown] = useState(SHOW_MORE)
  const [listed, setListed] = useState(0)
  const [place, setPlace] = useState(s.gated ? null : s.where.opensOn)
  const [row, setRow] = useState(s.gated ? null : s.sources.opensOn)

  if (s.gated) {
    return (
      <section className="es" aria-labelledby="es-title">
        <h2 id="es-title" className="es-title">What each claim stands on</h2>
        <p className="es-dek">{s.sentence}</p>
      </section>
    )
  }

  const judged = s.total - s.counts.method
  let x = 0
  const segs = VERDICTS.filter((v) => s.counts[v.key] > 0).map((v) => {
    const n = s.counts[v.key]
    const w = (n / judged) * 100
    const seg = { key: v.key, n, w, at: x, label: v.bar[n === 1 ? 0 : 1] }
    x += w
    return seg
  })
  // Line by line, so a phone's two-by-two grid reads in the same order.
  const labels = placeLabels(segs).sort((a, b) => a.line - b.line || a.at - b.at)
  const labelLines = Math.max(...labels.map((l) => l.line)) + 1

  const first = s.checkFirst.slice(0, shown)
  const allOpen = listed > 0
  const byPlace = (idx) => {
    const groups = []
    for (const i of idx) {
      const c = s.claims[i]
      const last = groups[groups.length - 1]
      if (last && last.place === c.place) last.claims.push(c)
      else groups.push({ place: c.place, claims: [c] })
    }
    return groups
  }
  const P = s.where.places[place]
  const R = s.sources.rows.find((r) => r.key === row)
  const maxRow = Math.max(...s.sources.rows.map((r) => r.claims))

  return (
    <section className="es" aria-labelledby="es-title">
      <h2 id="es-title" className="es-title">What each claim stands on</h2>
      <p className="es-dek">{s.dek}</p>

      {/* 1. How much of this stands on anything? */}
      <div className="es-bar" role="img" aria-label={segs.map((g) => `${g.n} ${g.label}`).join(', ')}>
        {segs.map((g) => <span key={g.key} className="es-seg" data-v={g.key} style={{ width: `${g.w}%` }} />)}
      </div>
      <div className="es-labels" style={{ '--lines': labelLines }} aria-hidden="true">
        {labels.map((l) => (
          <div key={l.key} className={`es-lab${l.tick ? ' is-tick' : ''}${l.right ? ' is-right' : ''}`}
            style={{ '--line': l.line, ...(l.right ? { right: `${100 - l.at - l.w}%` } : { left: `${l.at}%` }) }}>
            <b>{l.n}</b>{l.label}
          </div>
        ))}
      </div>
      {s.methods && <p className="es-note">{s.methods}</p>}

      {/* 2. Which claims should I check? */}
      {s.checkFirst.length > 0 && (
        <>
          <h3 className="es-h">Check these first</h3>
          <ol className="es-check">
            {first.map((i, k) => {
              const c = s.claims[i]
              return (
                <li key={i}>
                  <span className="es-num">{k + 1}</span>
                  <div>
                    <p className="es-q"><Quote c={c} /></p>
                    <p className="es-why">{c.reason}</p>
                    <p className="es-where">{s.where.places[c.place].label}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          {shown < s.checkFirst.length && (
            <button type="button" className="es-more" onClick={() => setShown(s.checkFirst.length)}>Show {Math.min(SHOW_MORE, s.checkFirst.length - shown)} more</button>
          )}
          {shown >= s.checkFirst.length && !allOpen && s.needs > s.checkFirst.length && (
            <button type="button" className="es-more" onClick={() => setListed(LIST_STEP)}>Show all {s.needs} that need checking</button>
          )}
          {allOpen && (
            <div className="es-all">
              {byPlace(s.allNeeds.slice(0, listed)).map((g, k) => (
                <div key={`${g.place}-${k}`}>
                  <p className="es-group">{s.where.places[g.place].label}</p>
                  {g.claims.map((c) => (
                    <p key={c.index} className="es-ex"><Quote c={c} /><span className="is-needs">{c.reason}</span></p>
                  ))}
                </div>
              ))}
              {listed < s.allNeeds.length && (
                <button type="button" className="es-more" onClick={() => setListed(listed + LIST_STEP)}>
                  Show {Math.min(LIST_STEP, s.allNeeds.length - listed)} more
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* 3. Where are they? */}
      <h3 className="es-h">Where they are</h3>
      <p className="es-key"><i aria-hidden="true" />a claim that needs checking</p>
      <div className="es-pages">
        {s.where.places.map((p) => (
          <button key={p.key} type="button" className="es-pg" aria-pressed={p.key === place} onClick={() => setPlace(p.key)}
            aria-label={`${p.label}: ${p.claims.length ? `${p.needs} of ${plural(p.claims.length, 'claim', 'claims')} ${p.needs === 1 ? 'needs' : 'need'} checking` : 'no claims'}`}>
            {p.claims.map((i) => {
              const c = s.claims[i]
              return <span key={i} className="es-ln" data-v={c.needs ? 'needs' : c.verdict} style={{ width: `${62 + ((i * 37) % 38)}%` }} />
            })}
          </button>
        ))}
      </div>
      <div className="es-ends" aria-hidden="true"><span>Start</span><span>End</span></div>
      {P && (
        <div className="es-panel" aria-live="polite">
          <p className="es-count">
            {P.claims.length === 0 ? `${P.label}: no claims.`
              : P.needs === 0 ? `${P.label}: none of its ${plural(P.claims.length, 'claim', 'claims')} ${P.claims.length === 1 ? 'needs' : 'need'} checking.`
                : `${P.label}: ${P.needs} of ${plural(P.claims.length, 'claim', 'claims')} ${P.needs === 1 ? 'needs' : 'need'} checking.`}
          </p>
          {P.example != null && <Example c={s.claims[P.example]} />}
        </div>
      )}

      {/* 4. What do the claims lean on? */}
      <h3 className="es-h">What they lean on</h3>
      <div className="es-rows">
        {s.sources.rows.map((r) => {
          const segsR = [['backed', r.backed], ['overstates', r.overstates], ['fact', r.fact], ['cautious', r.cautious]].filter(([, n]) => n)
          return (
            <button key={r.key} type="button" className="es-row" aria-pressed={r.key === row} onClick={() => setRow(r.key)}>
              <span className="es-src-cell">
                <span className="es-src">{r.label}</span>
                <span className="es-sub">{r.sub}</span>
              </span>
              <span className="es-track">
                <span className="es-bars" style={{ width: `calc((100% - 150px) * ${r.claims / maxRow})` }} aria-hidden="true">
                  {segsR.map(([v, n]) => <span key={v} className="es-seg" data-v={v} style={{ width: `${(n / r.claims) * 100}%` }} />)}
                </span>
                <span className="es-n">{r.claims}{r.needs > 0 && <>, <em>{needLine(r.needs)}</em></>}</span>
              </span>
            </button>
          )
        })}
      </div>
      {R && (
        <div className="es-panel" aria-live="polite">
          {R.examples.length
            ? R.examples.map((i) => <Example key={i} c={s.claims[i]} />)
            : <p className="es-ex">{R.claims === 1 ? '1 claim leans on this.' : `${R.claims} claims lean on this.`}</p>}
        </div>
      )}
    </section>
  )
}
