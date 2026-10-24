import { useEffect, useState } from "react";
import { api, type ClaimDomain, type ClaimRecord, type EdgeView, type StudyDesign } from "../api";

/** "systematic_review of [rct]" so synthesis strength is visible; an unspecified
 *  synthesis is called out honestly rather than shown as a bare review. */
function fmtDesign(d: StudyDesign): string {
  if (!d.synthesis_of.length) return d.design;
  if (d.synthesis_of.length === 1 && d.synthesis_of[0] === "UNSPECIFIED") {
    return `${d.design} of [unspecified — tier defaulted to MODERATE]`;
  }
  return `${d.design} of [${d.synthesis_of.join(", ")}]`;
}
import { GRADE_LABEL, consistencyWord, gradeStroke } from "../graph/semantics";

interface Props {
  edge: EdgeView;
  onRegrade: (claimText: string, domain: ClaimDomain, healthTyped: boolean) => Promise<ClaimRecord | null>;
  onClose: () => void;
}

/** Edge = a causal claim (its mechanism_text). Shows the claim's current grade
 *  DECOMPOSITION (components + citations + transfer_note) and a re-grade button. */
export function EvidencePanel({ edge, onRegrade, onClose }: Props) {
  const claimText = edge.mechanism_text ?? "";
  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [domain, setDomain] = useState<ClaimDomain>("POLICY");
  const [healthTyped, setHealthTyped] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setClaim(null);
    if (!claimText) return;
    api.claim(claimText).then((r) => setClaim(r.claim)).catch(() => setClaim(null));
  }, [claimText]);

  async function regrade() {
    setBusy(true);
    const rec = await onRegrade(claimText, domain, healthTyped);
    if (rec) setClaim(rec);
    setBusy(false);
  }

  const grade = claim?.evidence_grade ?? edge.evidence_grade;
  const comps = claim?.grade_components ?? null;

  return (
    <aside className="flex h-full w-96 flex-col border-l border-[var(--hairline)] bg-[var(--surface-raised)]">
      <header className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
            {edge.type} edge · evidence
          </div>
          <div className="font-mono text-xs text-[var(--ink-muted)]">{edge.source} → {edge.target}</div>
        </div>
        <button onClick={onClose} className="rounded px-2 py-1 text-[var(--ink-muted)] hover:bg-black/5">✕</button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">Causal claim</div>
          <div className="mt-1">{claimText || <span className="text-[var(--ink-muted)]">—</span>}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded px-2 py-0.5 text-xs font-semibold text-white"
            style={{ background: gradeStroke(grade ?? null).color }}
          >
            {grade ? GRADE_LABEL[grade] : "ungraded"}
          </span>
          {/* consistency at the top level: the two CONTESTED flavors (mixed vs
              contradicting) must be distinguishable at a glance */}
          {comps && consistencyWord(comps.consistency) && (
            <span className="rounded border border-[var(--hairline)] px-2 py-0.5 text-xs">
              {consistencyWord(comps.consistency)}
            </span>
          )}
          {claim?.graded_at != null && (
            <span className="text-[11px] text-[var(--ink-muted)]">
              graded {new Date(claim.graded_at * 1000).toLocaleDateString()} (snapshot)
            </span>
          )}
        </div>

        {/* defaulted-tier honesty banner — same register as PENDING/estimate */}
        {comps?.defaulted_tier && (
          <div
            className="rounded border px-2 py-1 text-[11px]"
            style={{ borderColor: "var(--coding-pending)", color: "var(--coding-pending)" }}
          >
            ⋯ tier defaulted to MODERATE — the review's constituent designs were
            unspecified. Re-grade to resolve (a person can read the full text).
          </div>
        )}

        {/* decomposition */}
        {comps ? (
          <div className="space-y-1 rounded border border-[var(--hairline)] p-2 text-xs">
            <div className="mb-1 font-medium">Grade decomposition</div>
            <Row k="domain" v={comps.domain} />
            <Row k="design tier (decides)" v={comps.design_tier_class} />
            <Row k="consistency" v={comps.consistency} />
            <Row k="directness" v={comps.directness} />
            <Row k="study designs" v={comps.per_study_designs.map(fmtDesign).join(", ") || "—"} />
            <Row k="normalized (display)" v={comps.design_tier.toFixed(2)} />
          </div>
        ) : (
          <div className="text-xs text-[var(--ink-muted)]">
            No graded components yet — re-grade to retrieve evidence.
          </div>
        )}

        {/* citations */}
        {claim && claim.citations.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
              Citations ({claim.citations.length})
            </div>
            <ul className="space-y-1 text-xs">
              {claim.citations.map((c, i) => (
                <li key={i} className="rounded border border-[var(--hairline)] p-1.5">
                  <div className="font-medium leading-tight">{c.title}</div>
                  <div className="text-[var(--ink-muted)]">
                    {[c.venue, c.year, c.study_design].filter(Boolean).join(" · ")}
                    {c.doi && (
                      <>
                        {" · "}
                        <a className="text-[var(--path-highlight)]" href={`https://doi.org/${c.doi}`} target="_blank" rel="noreferrer">
                          {c.doi}
                        </a>
                      </>
                    )}
                    <span className="ml-1 opacity-60">[{c.source}]</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* re-grade controls */}
      <footer className="space-y-2 border-t border-[var(--hairline)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--ink-muted)]">domain</span>
          <div className="flex overflow-hidden rounded border border-[var(--hairline)]">
            {(["POLICY", "HEALTH"] as ClaimDomain[]).map((d) => (
              <button
                key={d}
                onClick={() => { setDomain(d); if (d === "HEALTH") setHealthTyped(true); }}
                className={`px-2 py-0.5 ${domain === d ? "bg-[var(--path-highlight)] text-white" : "text-[var(--ink-muted)]"}`}
              >
                {d.toLowerCase()}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={healthTyped} onChange={(e) => setHealthTyped(e.target.checked)} />
            PubMed
          </label>
        </div>
        <button
          onClick={regrade}
          disabled={busy || !claimText}
          className="w-full rounded bg-[var(--path-highlight)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Grading…" : "Re-grade from evidence"}
        </button>
      </footer>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[var(--ink-muted)]">{k}</span>
      <span className="text-right font-mono">{v}</span>
    </div>
  );
}
