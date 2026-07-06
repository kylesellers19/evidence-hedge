import { useState, useMemo, useEffect } from "react";
import "../styles/landing.css";
import { classifyPosture } from "../engine/classifyPosture.js";

/**
 * RubricBranch — the branching screen the person lands on right after
 * submitting a document.
 *
 * Autodetect has already run; the detected rubric arrives preselected. A small,
 * secondary, user-overridable POSTURE control shows the classifier's read for
 * the selected rubric and re-runs when the rubric is overridden. Confirm →
 * analysis with the CONFIRMED rubric + CONFIRMED posture.
 *
 * Props:
 *   rubrics      array of rubric configs from rubrics/index.js
 *   detectedId   id returned by autodetect (may be undefined)
 *   text         the submitted document (for posture classification)
 *   onConfirm(rubricId, posture)
 *   onBack()
 *
 * Property access adapts to the real RubricConfig shape:
 * { id, label, description, stub, tiers: [], tolerance: { ceilings: {default,…} } }.
 * Numbers are the evidence — figures render in mono. Posture control is styled
 * inline against the shared tokens (landing.css is intentionally untouched).
 */

const BRANCH_COLORS = {
  corporate: "#3557A7",
  research: "#8C2F39",
  journalism: "#C58A17",
  general: "#2F6B4F",
};

// Inline styles — same register as landing.css: hairline borders, square
// corners, whisper shadow (≤ 0.08 alpha), navy accent, no new colors.
const postureOptStyle = (active) => ({
  fontFamily: "var(--eh-sans)",
  fontSize: "11px",
  letterSpacing: "0.06em",
  textTransform: "capitalize",
  padding: "6px 12px",
  cursor: "pointer",
  background: active ? "var(--eh-navy)" : "var(--eh-paper)",
  color: active ? "#fff" : "var(--eh-ink)",
  border: "1px solid " + (active ? "var(--eh-navy)" : "var(--eh-hairline)"),
  boxShadow: active ? "0 2px 8px rgba(23,24,26,0.07)" : "none",
});

export default function RubricBranch({ rubrics = [], detectedId, text = "", onConfirm, onBack }) {
  const [selected, setSelected] = useState(detectedId || rubrics[0]?.id);
  const [postureOverride, setPostureOverride] = useState(null);

  const selectedRubric = rubrics.find((r) => r.id === selected) || rubrics[0];

  // Classify posture for the selected rubric; re-runs on rubric override.
  const classification = useMemo(
    () => classifyPosture(text, selectedRubric),
    [text, selectedRubric]
  );

  // A fresh rubric selection clears any manual posture override.
  useEffect(() => { setPostureOverride(null); }, [selected]);

  const activePosture = postureOverride || classification.posture;

  return (
    <main className="eh-branch">
      <header className="eh-branch-head">
        <button className="eh-backlink" onClick={onBack}>← Different document</button>
        <p className="eh-microlabel">
          {detectedId ? "Document read · rubric detected" : "Document read · choose a rubric"}
        </p>
        <h1 className="eh-branch-title">Confirm the standard it will be held to</h1>
        <p className="eh-branch-sub">
          Every document is scored against one declared rubric, applied uniformly.
          {detectedId ? " Autodetect suggests one; you decide." : " Pick the standard that fits."}
        </p>
      </header>

      <div className="eh-branch-grid" role="radiogroup" aria-label="Rubric">
        {rubrics.map((r) => {
          const color = BRANCH_COLORS[r.id] || "var(--eh-ink)";
          const isSel = r.id === selected;
          const isDetected = r.id === detectedId;
          // Show the active-posture ceiling table on the selected card, the
          // default table on the others.
          const ceilings = r.tolerance?.ceilings || {};
          const shownCeil = (isSel && ceilings[activePosture]) || ceilings.default;
          const tierCount = Array.isArray(r.tiers) ? r.tiers.length : 0;

          return (
            <button
              key={r.id}
              role="radio"
              aria-checked={isSel}
              className={`eh-rubric-card${isSel ? " is-selected" : ""}`}
              style={{ "--branch": color }}
              onClick={() => setSelected(r.id)}
            >
              <div className="eh-rubric-cardtop">
                <span className="eh-rubric-name">{r.label || r.id}</span>
                {isDetected && <span className="eh-tag eh-tag-detected">Detected</span>}
                {r.stub && <span className="eh-tag">Draft</span>}
              </div>

              {r.description && <p className="eh-rubric-desc">{r.description}</p>}

              <dl className="eh-rubric-criteria">
                {Array.isArray(shownCeil) && (
                  <div>
                    <dt>Tolerance ceilings{isSel ? ` · ${activePosture}` : ""}</dt>
                    <dd><span className="eh-num">{shownCeil.join(" · ")}</span></dd>
                  </div>
                )}
                {tierCount > 0 && (
                  <div>
                    <dt>Assertiveness tiers</dt>
                    <dd><span className="eh-num">{tierCount}</span> tiers</dd>
                  </div>
                )}
              </dl>
            </button>
          );
        })}
      </div>

      {/* ── Posture control — secondary, user-overridable ──────────────────── */}
      {selectedRubric?.postures?.length > 0 && (
        <section
          aria-label="Posture"
          style={{
            marginTop: "24px",
            paddingTop: "18px",
            borderTop: "1px solid var(--eh-hairline)",
          }}
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
              {postureOverride && postureOverride !== classification.posture && " · overridden"}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Posture override"
            style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}
          >
            {selectedRubric.postures.map((p) => {
              const active = p === activePosture;
              return (
                <button
                  key={p}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPostureOverride(p)}
                  style={postureOptStyle(active)}
                >
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
        <button
          className="eh-submit"
          disabled={!selected}
          onClick={() => onConfirm(selected, activePosture)}
        >
          Run the analysis
        </button>
      </div>
    </main>
  );
}
