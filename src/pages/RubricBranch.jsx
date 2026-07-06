import { useState } from "react";
import "../styles/landing.css";

/**
 * RubricBranch — the branching screen the person lands on right after
 * submitting a document.
 *
 * Autodetect has already run; the detected rubric arrives preselected with its
 * criteria laid open. The other rubrics are selectable alternatives. Confirm →
 * analysis with the CONFIRMED rubric (never the autodetected one if changed).
 *
 * Props:
 *   rubrics      array of rubric configs from rubrics/index.js
 *   detectedId   id returned by autodetect (may be undefined)
 *   onConfirm(rubricId)
 *   onBack()
 *
 * Property access is defensive and adapted to the real RubricConfig shape in
 * this repo: { id, label, description, stub, tiers: [], tolerance: { ceilings,
 * nearNullRank } }. Numbers are the evidence — figures render in mono.
 *
 * Branch colors match the mark's offshoot streams (navy=corporate,
 * oxblood=research, ochre=journalism, forest=general) — the logo is the map.
 */

const BRANCH_COLORS = {
  corporate: "#3557A7",
  research: "#8C2F39",
  journalism: "#C58A17",
  general: "#2F6B4F",
};

export default function RubricBranch({ rubrics = [], detectedId, onConfirm, onBack }) {
  const [selected, setSelected] = useState(detectedId || rubrics[0]?.id);

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
          const ceilings = r.tolerance?.ceilings;
          const nearNull = r.tolerance?.nearNullRank;
          const tierCount = Array.isArray(r.tiers)
            ? r.tiers.length
            : r.tiers
            ? Object.keys(r.tiers).length
            : 0;

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
                <span className="eh-rubric-name">{r.label || r.name || r.id}</span>
                {isDetected && <span className="eh-tag eh-tag-detected">Detected</span>}
                {r.stub && <span className="eh-tag">Draft</span>}
              </div>

              {r.description && <p className="eh-rubric-desc">{r.description}</p>}

              <dl className="eh-rubric-criteria">
                {Array.isArray(ceilings) && (
                  <div>
                    <dt>Tolerance ceilings</dt>
                    <dd><span className="eh-num">{ceilings.join(" · ")}</span></dd>
                  </div>
                )}
                {typeof nearNull === "number" && (
                  <div>
                    <dt>Null-source rank</dt>
                    <dd>
                      <span className="eh-num">{nearNull}</span> — unsourced assertions flagged loudest
                    </dd>
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

      <div className="eh-branch-actions">
        <button
          className="eh-submit"
          disabled={!selected}
          onClick={() => onConfirm(selected)}
        >
          Run the analysis
        </button>
      </div>
    </main>
  );
}
