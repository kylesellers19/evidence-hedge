import { useEffect, useState, type ReactNode } from "react";
import type {
  CodingStatus,
  Confidence,
  DistributionalEffect,
  EffectType,
  NodeView,
  Overlays,
  Register,
  RegisterEngagement,
  TraditionAttribution,
} from "../api";
import { REGISTER_LABEL, confidenceOpacity, registerVar } from "../graph/semantics";

interface Props {
  node: NodeView;
  overlays: Overlays;
  onEdit: (id: string, changes: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}

interface ProctorScore {
  score: number;
  justification: string;
}

const PROCTOR_KEYS = ["acceptability", "feasibility", "cost", "sustainability", "adoption"] as const;
const REGISTERS: Register[] = [
  "MARKET", "INDUSTRIAL", "CIVIC", "DOMESTIC", "INSPIRED", "FAME", "GREEN", "PROJECTIVE",
];
const TRADITIONS = [
  "kantian_deontological", "virtue_ethical", "utilitarian_aggregate", "libertarian_nozickian",
];
const CONFIDENCES: Confidence[] = ["HIGH", "MODERATE", "LOW"];
const EFFECT_TYPES: EffectType[] = [
  "FINANCIAL", "HEALTH", "WELFARE", "ACCESS", "DISPLACEMENT", "OTHER",
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function SidePanel({ node, overlays, onEdit, onClose }: Props) {
  const data = node.data as Record<string, any>;
  const [label, setLabel] = useState(node.label);
  const [goalRelevance, setGoalRelevance] = useState<number>(node.goal_relevance ?? 0);
  const [registers, setRegisters] = useState<RegisterEngagement[]>([]);
  const [traditions, setTraditions] = useState<TraditionAttribution[]>([]);
  const [effects, setEffects] = useState<DistributionalEffect[]>([]);
  const [coding, setCoding] = useState<CodingStatus | null>(node.coding_status);
  const [proctor, setProctor] = useState<Record<string, ProctorScore>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLabel(node.label);
    setGoalRelevance(node.goal_relevance ?? 0);
    setRegisters((data.registers as RegisterEngagement[]) ?? []);
    setTraditions((data.traditions as TraditionAttribution[]) ?? []);
    setEffects((data.distributional_effects as DistributionalEffect[]) ?? []);
    setCoding(node.coding_status);
    setProctor((data.proctor_scores as Record<string, ProctorScore>) ?? {});
    setMsg(null);
  }, [node.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(overrideCoding?: CodingStatus) {
    setSaving(true);
    setMsg(null);
    const codingToWrite = overrideCoding ?? coding;
    const changes: Record<string, unknown> = { label };
    if (node.type !== "SEED" && codingToWrite) changes.coding_status = codingToWrite;
    if (node.type === "CONSEQUENCE") {
      changes.goal_relevance = goalRelevance;
      changes.registers = registers;
      changes.traditions = traditions;
      changes.distributional_effects = effects;
    }
    if (node.type === "DECISION") changes.proctor_scores = proctor;
    const ok = await onEdit(node.id, changes);
    if (ok && overrideCoding) setCoding(overrideCoding);
    setMsg(ok ? `Saved — logged${codingToWrite ? ` @ ${codingToWrite}` : ""}` : "Rejected (schema violation)");
    setSaving(false);
  }

  const clashPairs = overlays.register_clashes.filter((c) => c.node_id === node.id);
  const clashed = new Set(clashPairs.flatMap((c) => [c.register_a, c.register_b]));

  return (
    <aside className="flex h-full w-96 flex-col border-l border-[var(--hairline)] bg-[var(--surface-raised)]">
      <header className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
            {node.type} · ring {node.ring}
            {coding ? (
              <span style={{ color: coding === "PENDING" ? "var(--coding-pending)" : "var(--closure)" }}>
                {" "}· {coding === "PENDING" ? "pending" : "verified"}
              </span>
            ) : null}
          </div>
          <div className="font-mono text-xs text-[var(--ink-muted)]">{node.id}</div>
        </div>
        <button onClick={onClose} className="rounded px-2 py-1 text-[var(--ink-muted)] hover:bg-black/5">✕</button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        <Field label="Label">
          <textarea
            className="w-full rounded border border-[var(--hairline)] bg-transparent p-2"
            rows={2}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>

        {node.type === "CONSEQUENCE" && (
          <>
            <Field label={`Goal relevance (${goalRelevance.toFixed(2)})`}>
              <input
                type="range" min={0} max={1} step={0.01} value={goalRelevance}
                onChange={(e) => setGoalRelevance(Number(e.target.value))}
                className="w-full"
              />
            </Field>

            {/* register engagements */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                  Registers (orders of worth)
                </span>
                <button
                  className="text-[11px] text-[var(--path-highlight)]"
                  onClick={() => setRegisters([...registers, {
                    register: "MARKET", signature_marker: "", justification: "", confidence: "MODERATE",
                  }])}
                >+ add</button>
              </div>
              {clashPairs.length > 0 && (
                <div className="mb-1 text-[11px]" style={{ color: "var(--register-clash)" }}>
                  ◈ clash: {clashPairs.map((c) => `${c.register_a}×${c.register_b}`).join(", ")}
                </div>
              )}
              <div className="space-y-2">
                {registers.map((r, i) => (
                  <div key={i} className="rounded border p-2"
                       style={{ borderColor: clashed.has(r.register) ? "var(--register-clash)" : "var(--hairline)" }}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-block h-3 w-3 rounded-sm"
                            style={{ background: registerVar(r.register), opacity: confidenceOpacity(r.confidence) }} />
                      <select
                        value={r.register}
                        onChange={(e) => upd(registers, setRegisters, i, { register: e.target.value as Register })}
                        className="flex-1 rounded border border-[var(--hairline)] bg-transparent px-1"
                      >
                        {REGISTERS.map((rg) => <option key={rg} value={rg}>{REGISTER_LABEL[rg]}</option>)}
                      </select>
                      <select
                        value={r.confidence}
                        onChange={(e) => upd(registers, setRegisters, i, { confidence: e.target.value as Confidence })}
                        className="rounded border border-[var(--hairline)] bg-transparent px-1"
                      >
                        {CONFIDENCES.map((c) => <option key={c} value={c}>{c[0]}</option>)}
                      </select>
                      <button className="text-[var(--ink-muted)]" onClick={() => rm(registers, setRegisters, i)}>✕</button>
                    </div>
                    <input
                      placeholder="signature marker (quoted phrase)"
                      value={r.signature_marker}
                      onChange={(e) => upd(registers, setRegisters, i, { signature_marker: e.target.value })}
                      className="mt-1 w-full rounded border border-[var(--hairline)] bg-transparent px-1 text-xs italic"
                    />
                    <textarea
                      placeholder="justification" rows={1} value={r.justification}
                      onChange={(e) => upd(registers, setRegisters, i, { justification: e.target.value })}
                      className="mt-1 w-full rounded border border-[var(--hairline)] bg-transparent p-1 text-xs"
                    />
                  </div>
                ))}
                {!registers.length && <div className="text-xs text-[var(--ink-muted)]">No registers coded.</div>}
              </div>
            </div>

            {/* tradition attributions */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">Traditions</span>
                <button
                  className="text-[11px] text-[var(--path-highlight)]"
                  onClick={() => setTraditions([...traditions, {
                    tradition: TRADITIONS[0], signature_marker: "", justification: "", confidence: "MODERATE",
                  }])}
                >+ add</button>
              </div>
              <div className="space-y-2">
                {traditions.map((t, i) => (
                  <div key={i} className="rounded border border-[var(--hairline)] p-2">
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={t.tradition}
                        onChange={(e) => upd(traditions, setTraditions, i, { tradition: e.target.value })}
                        className="flex-1 rounded border border-[var(--hairline)] bg-transparent px-1"
                        style={{ opacity: confidenceOpacity(t.confidence) }}
                      >
                        {TRADITIONS.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
                      </select>
                      <select
                        value={t.confidence}
                        onChange={(e) => upd(traditions, setTraditions, i, { confidence: e.target.value as Confidence })}
                        className="rounded border border-[var(--hairline)] bg-transparent px-1"
                      >
                        {CONFIDENCES.map((c) => <option key={c} value={c}>{c[0]}</option>)}
                      </select>
                      <button className="text-[var(--ink-muted)]" onClick={() => rm(traditions, setTraditions, i)}>✕</button>
                    </div>
                    <input
                      placeholder="signature marker (quoted phrase)"
                      value={t.signature_marker}
                      onChange={(e) => upd(traditions, setTraditions, i, { signature_marker: e.target.value })}
                      className="mt-1 w-full rounded border border-[var(--hairline)] bg-transparent px-1 text-xs italic"
                    />
                    <textarea
                      placeholder="justification" rows={1} value={t.justification}
                      onChange={(e) => upd(traditions, setTraditions, i, { justification: e.target.value })}
                      className="mt-1 w-full rounded border border-[var(--hairline)] bg-transparent p-1 text-xs"
                    />
                  </div>
                ))}
                {!traditions.length && <div className="text-xs text-[var(--ink-muted)]">No traditions attributed.</div>}
              </div>
            </div>

            {/* distributional effects — the who-bears-what table (descriptive) */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                  Distributional effects
                </span>
                <button
                  className="text-[11px] text-[var(--path-highlight)]"
                  onClick={() => setEffects([...effects, {
                    stakeholder_id: "", effect_type: "FINANCIAL", direction: -1,
                    magnitude_note: "", evidence_claim_ref: null,
                  }])}
                >+ add</button>
              </div>
              <div className="space-y-2">
                {effects.map((ef, i) => (
                  <div key={i} className="rounded border border-[var(--hairline)] p-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <input
                        placeholder="stakeholder_id" value={ef.stakeholder_id}
                        onChange={(e) => upd(effects, setEffects, i, { stakeholder_id: e.target.value })}
                        className="flex-1 rounded border border-[var(--hairline)] bg-transparent px-1"
                      />
                      <select
                        value={ef.effect_type}
                        onChange={(e) => upd(effects, setEffects, i, { effect_type: e.target.value as EffectType })}
                        className="rounded border border-[var(--hairline)] bg-transparent px-1"
                      >
                        {EFFECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select
                        value={ef.direction}
                        onChange={(e) => upd(effects, setEffects, i, { direction: Number(e.target.value) as -1 | 1 })}
                        className="rounded border border-[var(--hairline)] bg-transparent px-1"
                        style={{ color: ef.direction < 0 ? "var(--atlas-opposition)" : "var(--atlas-cobelief)" }}
                      >
                        <option value={-1}>− harm</option>
                        <option value={1}>+ benefit</option>
                      </select>
                      <button className="text-[var(--ink-muted)]" onClick={() => rm(effects, setEffects, i)}>✕</button>
                    </div>
                    <input
                      placeholder="magnitude note (prose)" value={ef.magnitude_note}
                      onChange={(e) => upd(effects, setEffects, i, { magnitude_note: e.target.value })}
                      className="mt-1 w-full rounded border border-[var(--hairline)] bg-transparent px-1 text-xs"
                    />
                  </div>
                ))}
                {!effects.length && <div className="text-xs text-[var(--ink-muted)]">No effects recorded.</div>}
                <p className="text-[10px] text-[var(--ink-muted)]">
                  Descriptive empirical impacts, not moral scores.
                </p>
              </div>
            </div>
          </>
        )}

        {node.type === "DECISION" && (
          <>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">Alternatives</div>
              <ul className="list-disc pl-5 text-xs">
                {((data.alternatives as string[]) ?? []).map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>

            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">Proctor scores (1–5)</div>
              <div className="space-y-2">
                {PROCTOR_KEYS.map((k) => {
                  const ps = proctor[k] ?? { score: 3, justification: "" };
                  return (
                    <div key={k} className="rounded border border-[var(--hairline)] p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium capitalize">{k}</span>
                        <input
                          type="number" min={1} max={5} value={ps.score}
                          onChange={(e) => setProctor({ ...proctor, [k]: { ...ps, score: Number(e.target.value) } })}
                          className="w-14 rounded border border-[var(--hairline)] bg-transparent px-1"
                        />
                      </div>
                      <textarea
                        rows={1} value={ps.justification}
                        onChange={(e) => setProctor({ ...proctor, [k]: { ...ps, justification: e.target.value } })}
                        className="mt-1 w-full rounded border border-[var(--hairline)] bg-transparent p-1 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {node.type === "SEED" && (
          <div className="space-y-2 text-xs">
            <div><span className="text-[var(--ink-muted)]">Goal state:</span> {String(data.goal_state_text)}</div>
            <div>
              <span className="text-[var(--ink-muted)]">Criteria:</span>{" "}
              {((data.goal_criteria as string[]) ?? []).join("; ")}
            </div>
          </div>
        )}

        {/* graph-level distributional burden (from distributional_effects) */}
        {Object.keys(overlays.burden_index).length > 0 && (
          <div className="border-t border-[var(--hairline)] pt-3 text-xs text-[var(--ink-muted)]">
            <div className="mb-1 uppercase tracking-wide">Stakeholder burden (exposure to harm)</div>
            {Object.entries(overlays.burden_index)
              .sort((a, b) => b[1] - a[1])
              .map(([sid, val]) => (
                <div key={sid} className="flex justify-between">
                  <span>{sid}</span>
                  <span className="font-mono">{val.toFixed(2)}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-[var(--hairline)] px-4 py-3">
        <button
          onClick={() => save()}
          disabled={saving}
          className="rounded bg-[var(--path-highlight)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save edits"}
        </button>
        {node.type !== "SEED" && coding !== "HUMAN_VERIFIED" && (
          <button
            onClick={() => save("HUMAN_VERIFIED")}
            disabled={saving}
            className="rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: "var(--closure)", color: "var(--closure)" }}
            title="Confirm this node's coding — writes to the correction log at the HUMAN_VERIFIED tier"
          >
            ✓ Verify
          </button>
        )}
        {msg && <span className="text-xs text-[var(--ink-muted)]">{msg}</span>}
      </footer>
    </aside>
  );
}

function upd<T>(arr: T[], set: (a: T[]) => void, i: number, patch: Partial<T>) {
  const n = [...arr];
  n[i] = { ...n[i], ...patch };
  set(n);
}
function rm<T>(arr: T[], set: (a: T[]) => void, i: number) {
  set(arr.filter((_, j) => j !== i));
}
