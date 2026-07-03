import { useEffect, useState, type ReactNode } from "react";
import type { NodeView, Overlays } from "../api";

interface Props {
  node: NodeView;
  overlays: Overlays;
  onEdit: (id: string, changes: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}

interface Valence {
  stakeholder_id: string;
  framework_id: string;
  sign: number;
  justification: string;
}
interface ProctorScore {
  score: number;
  justification: string;
}

const PROCTOR_KEYS = [
  "acceptability",
  "feasibility",
  "cost",
  "sustainability",
  "adoption",
] as const;

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
  const [valences, setValences] = useState<Valence[]>((data.valences as Valence[]) ?? []);
  const [proctor, setProctor] = useState<Record<string, ProctorScore>>(
    (data.proctor_scores as Record<string, ProctorScore>) ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLabel(node.label);
    setGoalRelevance(node.goal_relevance ?? 0);
    setValences((data.valences as Valence[]) ?? []);
    setProctor((data.proctor_scores as Record<string, ProctorScore>) ?? {});
    setMsg(null);
  }, [node.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    setMsg(null);
    const changes: Record<string, unknown> = { label };
    if (node.type === "CONSEQUENCE") {
      changes.goal_relevance = goalRelevance;
      changes.valences = valences;
    }
    if (node.type === "DECISION") changes.proctor_scores = proctor;
    const ok = await onEdit(node.id, changes);
    setMsg(ok ? "Saved — logged to correction store" : "Rejected (schema violation)");
    setSaving(false);
  }

  const burden = overlays.burden_index;

  return (
    <aside className="flex h-full w-96 flex-col border-l border-[var(--hairline)] bg-[var(--surface-raised)]">
      <header className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
            {node.type} · ring {node.ring}
            {node.is_divergence ? " · ⚡ divergence" : ""}
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
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={goalRelevance}
                onChange={(e) => setGoalRelevance(Number(e.target.value))}
                className="w-full"
              />
            </Field>

            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                Valences (stakeholder · framework · sign)
              </div>
              <div className="space-y-2">
                {valences.map((v, i) => (
                  <div key={i} className="rounded border border-[var(--hairline)] p-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium">{v.stakeholder_id}</span>
                      <span className="text-[var(--ink-muted)]">{v.framework_id}</span>
                      <input
                        type="number"
                        min={-2}
                        max={2}
                        value={v.sign}
                        onChange={(e) => {
                          const n = [...valences];
                          n[i] = { ...v, sign: Number(e.target.value) };
                          setValences(n);
                        }}
                        className="w-14 rounded border border-[var(--hairline)] bg-transparent px-1"
                      />
                    </div>
                    <textarea
                      className="mt-1 w-full rounded border border-[var(--hairline)] bg-transparent p-1 text-xs"
                      rows={2}
                      value={v.justification}
                      onChange={(e) => {
                        const n = [...valences];
                        n[i] = { ...v, justification: e.target.value };
                        setValences(n);
                      }}
                    />
                  </div>
                ))}
                {!valences.length && (
                  <div className="text-xs text-[var(--ink-muted)]">No valences yet.</div>
                )}
              </div>
            </div>
          </>
        )}

        {node.type === "DECISION" && (
          <>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                Alternatives
              </div>
              <ul className="list-disc pl-5 text-xs">
                {((data.alternatives as string[]) ?? []).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                Proctor scores (1–5)
              </div>
              <div className="space-y-2">
                {PROCTOR_KEYS.map((k) => {
                  const ps = proctor[k] ?? { score: 3, justification: "" };
                  return (
                    <div key={k} className="rounded border border-[var(--hairline)] p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium capitalize">{k}</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={ps.score}
                          onChange={(e) =>
                            setProctor({ ...proctor, [k]: { ...ps, score: Number(e.target.value) } })
                          }
                          className="w-14 rounded border border-[var(--hairline)] bg-transparent px-1"
                        />
                      </div>
                      <textarea
                        rows={1}
                        value={ps.justification}
                        onChange={(e) =>
                          setProctor({ ...proctor, [k]: { ...ps, justification: e.target.value } })
                        }
                        className="mt-1 w-full rounded border border-[var(--hairline)] bg-transparent p-1 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                CFIR tags
              </div>
              <div className="space-y-1 text-xs">
                {Object.entries((data.cfir_tags as Record<string, string[]>) ?? {}).map(
                  ([domain, tags]) => (
                    <div key={domain}>
                      <span className="capitalize text-[var(--ink-muted)]">
                        {domain.replace("_", " ")}:
                      </span>{" "}
                      {tags.length ? tags.join(", ") : "—"}
                    </div>
                  ),
                )}
              </div>
            </div>
          </>
        )}

        {node.type === "SEED" && (
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[var(--ink-muted)]">Goal state:</span> {String(data.goal_state_text)}
            </div>
            <div>
              <span className="text-[var(--ink-muted)]">Criteria:</span>{" "}
              {((data.goal_criteria as string[]) ?? []).join("; ")}
            </div>
          </div>
        )}

        <div className="border-t border-[var(--hairline)] pt-3 text-xs text-[var(--ink-muted)]">
          <div className="mb-1 uppercase tracking-wide">Stakeholder burden index</div>
          {Object.entries(burden)
            .sort((a, b) => b[1] - a[1])
            .map(([sid, val]) => (
              <div key={sid} className="flex justify-between">
                <span>{sid}</span>
                <span className="font-mono">{val.toFixed(2)}</span>
              </div>
            ))}
        </div>
      </div>

      <footer className="flex items-center gap-3 border-t border-[var(--hairline)] px-4 py-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-[var(--path-highlight)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save edits"}
        </button>
        {msg && <span className="text-xs text-[var(--ink-muted)]">{msg}</span>}
      </footer>
    </aside>
  );
}
