import { useState, useMemo, useEffect } from "react";
import "../styles/landing.css";
import { classifyPosture } from "../engine/classifyPosture.js";
import { judgmentFor } from "../rubrics/index.js";
import GenreReading from "../components/genre/GenreReading.jsx";
import JudgmentSummary from "../components/genre/JudgmentSummary.jsx";
import { GENRE_ORDER, GENRE_LABELS, genreHue } from "../components/genre/labels.js";

/**
 * RubricBranch — the screen the person lands on right after submitting a
 * document: how it was read, and how it will be judged.
 *
 * routeDocument has already run. The document's genre roles (speaker, form,
 * stake, evidence) decide the genres in play; one genre is judged by its
 * rubric, a mix by the hybrid scenarios (rubrics/hybrids.js). Nothing is chosen
 * by default — the person sees the reading, the standard and why, and may add
 * or drop a genre. A secondary POSTURE control shows the classifier's read for
 * the standard and re-runs when the judgment changes. Confirm → analysis with
 * the CONFIRMED genres + CONFIRMED posture.
 *
 * Props:
 *   route        routeDocument(text, { sourceUrl }) — profile.genre + judgment
 *   text         the submitted document (for posture classification)
 *   onConfirm(genres, posture)
 *   onBack()
 */

// Inline styles — same register as landing.css: hairline borders, square
// corners, no shadows, no new colors.
const postureOptStyle = (active) => ({
  fontFamily: "var(--eh-sans)",
  fontSize: "11px",
  letterSpacing: "0.06em",
  textTransform: "capitalize",
  padding: "6px 12px",
  cursor: "pointer",
  background: active ? "var(--eh-accent)" : "var(--eh-paper)",
  color: active ? "#fff" : "var(--eh-ink)",
  border: "1px solid " + (active ? "var(--eh-accent)" : "var(--eh-hairline)"),
});

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export default function RubricBranch({ route, text = "", onConfirm, onBack }) {
  const roles = route.profile.genre.roles;
  const detected = route.judgment.genres;
  const [chosen, setChosen] = useState(detected);
  const [postureOverride, setPostureOverride] = useState(null);

  // Detected genres keep their role order; added ones follow in display order.
  const toggle = (g) => {
    const set = new Set(chosen);
    if (set.has(g)) { if (set.size === 1) return; set.delete(g); } else set.add(g);
    setChosen([...detected.filter((x) => set.has(x)), ...GENRE_ORDER.filter((x) => set.has(x) && !detected.includes(x))]);
  };

  const judgment = useMemo(() => judgmentFor(roles, chosen), [roles, chosen]);
  const classification = useMemo(() => classifyPosture(text, judgment.rubric), [text, judgment.rubric]);

  // A different standard has different postures: clear any manual override.
  useEffect(() => { setPostureOverride(null); }, [judgment.standard]);

  const activePosture = postureOverride || classification.posture;
  const adjusted = !same(chosen, detected);
  const postures = judgment.rubric.postures || [];

  return (
    <main className="eh-branch">
      <header className="eh-branch-head">
        <button className="eh-backlink" onClick={onBack}>← Different document</button>
        <p className="eh-microlabel">
          {detected.length > 1 ? `Document read · ${detected.length} genres detected` : "Document read · one genre detected"}
        </p>
        <h1 className="eh-branch-title">How this document will be judged</h1>
        <p className="eh-branch-sub">
          Evidence Hedge reads who publishes it, what form it takes, whose stake stands behind it and what
          study it rests on. Every genre it finds is part of the judgment: one sets the evidence standard,
          the others add their audits.
        </p>
      </header>

      <div className="eh-reading-grid">
        <section aria-label="How it was read">
          <p className="eh-section-label">How it was read</p>
          <GenreReading roles={roles} />
        </section>

        <section aria-label="How it will be judged">
          <p className="eh-section-label">
            Judged as
            {adjusted && <span className="eh-adjusted"> · adjusted by you</span>}
          </p>
          <JudgmentSummary rubric={judgment.rubric} />
        </section>
      </div>

      {/* ── Genre override — secondary: add or drop a genre ──────────────── */}
      <section aria-label="Genres in play" className="eh-override">
        <div className="eh-override-head">
          <p className="eh-microlabel" style={{ margin: 0, textAlign: "left" }}>Genres in play</p>
          {adjusted && (
            <button type="button" className="eh-linkbutton" onClick={() => setChosen(detected)}>
              Reset to detected
            </button>
          )}
        </div>
        <div role="group" aria-label="Genres" className="eh-genre-toggles">
          {GENRE_ORDER.map((g) => {
            const on = chosen.includes(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                className={`eh-genre-toggle${on ? " is-on" : ""}`}
                style={{ "--genre": genreHue(g) }}
                onClick={() => toggle(g)}
              >
                <span className="eh-genre-swatch" aria-hidden="true" />
                {GENRE_LABELS[g]}
                {detected.includes(g) && <span className="eh-genre-detected">detected</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Posture control — secondary, user-overridable ──────────────────── */}
      {postures.length > 0 && (
        <section
          aria-label="Posture"
          style={{ marginTop: "20px", paddingTop: "18px", borderTop: "1px solid var(--eh-hairline)" }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
            <p className="eh-microlabel" style={{ margin: 0, textAlign: "left" }}>Posture</p>
            <span style={{ fontFamily: "var(--eh-sans)", fontSize: "12px", color: "var(--eh-ink-soft)" }}>
              Detected <span style={{ color: "var(--eh-ink)", textTransform: "capitalize" }}>{classification.posture}</span>
              {classification.confidence > 0 && (
                <span className="eh-num" style={{ marginLeft: "6px", fontSize: "11px", color: "var(--eh-ink-soft)" }}>
                  ({Math.round(classification.confidence * 100)}%)
                </span>
              )}
              {classification.zeroSignal && ` · ${classification.note}`}
              {postureOverride && postureOverride !== classification.posture && " · overridden"}
              {" · sets the verdict wording, never the score"}
            </span>
          </div>

          <div role="radiogroup" aria-label="Posture override" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            {postures.map((p) => {
              const active = p === activePosture;
              return (
                <button key={p} role="radio" aria-checked={active} onClick={() => setPostureOverride(p)} style={postureOptStyle(active)}>
                  {p}
                </button>
              );
            })}
          </div>

          {classification.evidence?.length > 0 && (
            <p style={{ fontFamily: "var(--eh-sans)", fontSize: "11px", color: "var(--eh-ink-soft)", margin: "10px 0 0", lineHeight: 1.5 }}>
              Signals:{" "}
              {classification.evidence.map((e, i) => (
                <span key={i}>
                  {i > 0 && "; "}
                  {e.signal} <span style={{ color: "var(--eh-ink)" }}>“{e.span}”</span>
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      <div className="eh-branch-actions">
        <button className="eh-submit" onClick={() => onConfirm(chosen, activePosture)}>
          Run the analysis
        </button>
      </div>
    </main>
  );
}
