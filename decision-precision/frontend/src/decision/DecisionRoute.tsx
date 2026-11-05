import { useCallback, useEffect, useRef, useState } from "react";
import { decisionApi, type DecisionAnalysis, type DecisionModel, type StepState } from "./decisionApi";
import { Gaps, Section, StepContent } from "./StepDetail";

type View = number | "disagreements" | "constants";

/** State as shape, not just color: hollow (empty), half (partial), full (complete). */
function StateMark({ state }: { state: StepState }) {
  const label = state === "EMPTY" ? "not started" : state === "PARTIAL" ? "has gaps" : "complete";
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" role="img" aria-label={label} className="shrink-0">
      <title>{label}</title>
      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {state === "PARTIAL" && <path d="M6 1 A5 5 0 0 1 6 11 Z" fill="currentColor" />}
      {state === "COMPLETE" && <circle cx="6" cy="6" r="5" fill="currentColor" />}
    </svg>
  );
}

function StartForm({ onStart, onLoad }: { onStart: (s: string, o: string) => void; onLoad: (f: File) => void }) {
  const [statement, setStatement] = useState("");
  const [owner, setOwner] = useState("");
  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Start a decision</h2>
        <p className="text-sm text-[var(--ink-muted)]">
          A decision compares at least two alternatives, including the status quo, against objectives the affected
          groups hold. It starts from the deliberation graph's seed question, typed as an alternative, an uncertainty,
          or an objective.
        </p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); if (statement && owner) onStart(statement, owner); }}
      >
        <label className="block text-sm">
          What is being decided
          <input value={statement} onChange={(e) => setStatement(e.target.value)} required
            className="mt-1 w-full rounded border border-[var(--hairline)] bg-[var(--surface-raised)] px-2 py-1.5" />
        </label>
        <label className="block text-sm">
          Who has authority to decide
          <input value={owner} onChange={(e) => setOwner(e.target.value)} required
            className="mt-1 w-full rounded border border-[var(--hairline)] bg-[var(--surface-raised)] px-2 py-1.5" />
        </label>
        <button type="submit" className="rounded bg-[var(--path-highlight)] px-3 py-1.5 text-sm text-white">Start decision</button>
      </form>
      <div className="text-sm">
        <label className="cursor-pointer text-[var(--path-highlight)] underline">
          Load a decision model (JSON)
          <input type="file" accept="application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && onLoad(e.target.files[0])} />
        </label>
        <span className="text-[var(--ink-muted)]"> · schema in docs/decision-model.schema.json</span>
      </div>
    </div>
  );
}

export function DecisionRoute() {
  const [model, setModel] = useState<DecisionModel | null>(null);
  const [analysis, setAnalysis] = useState<DecisionAnalysis | null>(null);
  const [view, setView] = useState<View>(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await decisionApi.get();
      setModel(r.model);
      setAnalysis(r.model ? await decisionApi.analysis() : null);
    } catch (e) {
      setError(`Could not reach the decision API: ${(e as Error).message}. Is the backend running on :8000?`);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try { await fn(); await refresh(); } catch (e) { setError((e as Error).message); }
  };

  const load = (f: File) => act(async () => decisionApi.replace(JSON.parse(await f.text())));
  const exportJson = () => {
    if (!model) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(model, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "decision-model.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (busy && !model) return <div className="grid h-full place-items-center text-[var(--ink-muted)]">Loading decision…</div>;
  if (!model || !analysis) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <p className="mx-auto max-w-xl px-6 pt-6 text-sm text-[var(--grade-contradicted)]">{error}</p>}
        <StartForm onStart={(s, o) => act(() => decisionApi.create(s, o))} onLoad={load} />
      </div>
    );
  }

  const step = typeof view === "number" ? analysis.steps.find((s) => s.number === view) : null;
  const relevant = analysis.disagreements.filter((d) => d.decision_relevant).length;

  return (
    <div className="flex min-h-0 flex-1">
      <nav aria-label="Decision steps" className="w-72 shrink-0 overflow-y-auto border-r border-[var(--hairline)] bg-[var(--surface-raised)] py-2">
        <ol>
          {analysis.steps.map((s) => (
            <li key={s.number}>
              <button
                onClick={() => setView(s.number)}
                aria-current={view === s.number ? "step" : undefined}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-[var(--path-highlight)] ${view === s.number ? "bg-black/5 font-medium" : "hover:bg-black/5"}`}
              >
                <span className="w-5 text-right tabular-nums text-[var(--ink-muted)]">{s.number}</span>
                <span className={s.state === "COMPLETE" ? "text-[var(--closure)]" : s.state === "PARTIAL" ? "text-[var(--grade-contested)]" : "text-[var(--ink-muted)]"}>
                  <StateMark state={s.state} />
                </span>
                <span className="min-w-0 flex-1 leading-snug">{s.name}</span>
                {s.gaps.length > 0 && <span className="text-[11px] tabular-nums text-[var(--ink-muted)]">{s.gaps.length}</span>}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-2 border-t border-[var(--hairline)] pt-2">
          <button onClick={() => setView("disagreements")} className={`flex w-full justify-between px-3 py-1.5 text-left text-sm ${view === "disagreements" ? "bg-black/5 font-medium" : "hover:bg-black/5"}`}>
            <span>Disagreement map</span>
            <span className="text-[11px] tabular-nums text-[var(--ink-muted)]">{analysis.disagreements.length}{relevant ? ` · ${relevant} matter` : ""}</span>
          </button>
          <button onClick={() => setView("constants")} className={`flex w-full justify-between px-3 py-1.5 text-left text-sm ${view === "constants" ? "bg-black/5 font-medium" : "hover:bg-black/5"}`}>
            <span>Provisional constants</span>
            <span className="text-[11px] tabular-nums text-[var(--ink-muted)]">{analysis.ratification.length}</span>
          </button>
        </div>
      </nav>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--hairline)] px-6 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{model.frame.decision_statement}</h2>
            <p className="text-[12px] text-[var(--ink-muted)]">Owner {model.frame.owner} · analysis {analysis.analysis_hash} · engine {analysis.engine_version}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <button onClick={() => fileRef.current?.click()} className="rounded border border-[var(--hairline)] px-2 py-1 hover:bg-black/5">Load JSON</button>
            <input ref={fileRef} type="file" accept="application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
            <button onClick={exportJson} className="rounded border border-[var(--hairline)] px-2 py-1 hover:bg-black/5">Export JSON</button>
            <button onClick={() => act(() => decisionApi.clear())} className="rounded border border-[var(--hairline)] px-2 py-1 text-[var(--grade-contradicted)] hover:bg-black/5">Clear decision</button>
          </div>
        </header>

        <div className="max-w-5xl space-y-6 px-6 py-5">
          {error && <p className="text-sm text-[var(--grade-contradicted)]">{error}</p>}

          {step && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{step.number}. {step.name}</h2>
                <p className="text-sm">{step.summary}</p>
                <p className="text-[12px] text-[var(--ink-muted)]">{step.grounding}</p>
              </div>
              <Section title={`Gaps (${step.gaps.length})`}><Gaps gaps={step.gaps} /></Section>
              <StepContent n={step.number} m={model} a={analysis} />
            </>
          )}

          {view === "disagreements" && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Disagreement map</h2>
                <p className="text-sm text-[var(--ink-muted)]">
                  Each conflict between groups, sorted by what would resolve it: evidence for factual disagreements,
                  tradeoffs for value disagreements, reframing for frame disagreements. Effects that differ by group
                  are listed separately because both groups can be right.
                </p>
              </div>
              {(["FACTUAL", "VALUE", "FRAME", "HETEROGENEITY"] as const).map((k) => {
                const ds = analysis.disagreements.filter((d) => d.kind === k);
                if (!ds.length) return null;
                const title = { FACTUAL: "Factual", VALUE: "Value", FRAME: "Frame", HETEROGENEITY: "Effects that differ by group" }[k];
                return (
                  <Section key={k} title={`${title} (${ds.length})`}>
                    <ul className="space-y-2 text-[13px]">
                      {ds.map((d, i) => (
                        <li key={i} className="border-l-2 border-[var(--hairline)] pl-2">
                          <div>
                            <span className="font-medium">{d.subject}</span>
                            <span className="text-[var(--ink-muted)]"> · {d.groups.join(", ")} · {d.decision_relevant === null ? "relevance unknown" : d.decision_relevant ? "changes the choice" : "does not change the choice"}</span>
                          </div>
                          <div>{d.detail}</div>
                          <button onClick={() => setView(d.route_to_step)} className="text-[var(--path-highlight)] underline">
                            Go to step {d.route_to_step}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Section>
                );
              })}
              {!analysis.disagreements.length && <p className="text-sm text-[var(--ink-muted)]">No disagreements detected yet. They appear once groups' statements, estimates, or weights are recorded.</p>}
            </>
          )}

          {view === "constants" && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Provisional constants</h2>
                <p className="text-sm text-[var(--ink-muted)]">Every judgment the analysis rests on that has not been ratified. Each one changes results.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead><tr className="border-b border-[var(--hairline)] text-[var(--ink-muted)]"><th className="py-1.5 pr-4 font-medium">Constant</th><th className="py-1.5 pr-4 font-medium">Value</th><th className="py-1.5 font-medium">Why it matters</th></tr></thead>
                  <tbody>
                    {analysis.ratification.map((r) => (
                      <tr key={r.constant} className="border-b border-[var(--hairline)] align-top last:border-0">
                        <td className="py-1.5 pr-4 font-medium">{r.constant}</td>
                        <td className="py-1.5 pr-4">{r.value}</td>
                        <td className="py-1.5">{r.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {analysis.graph_issues.length > 0 && typeof view === "number" && analysis.graph_issues.some((g) => g.step === view) && (
            <p className="text-[12px] text-[var(--ink-muted)]">Some references point at graph nodes not revealed yet; expand them on the Deliberation canvas.</p>
          )}
        </div>
      </main>
    </div>
  );
}
