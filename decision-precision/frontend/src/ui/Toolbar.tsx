import type { BudgetSnapshot, Overlays } from "../api";
import type { PathState } from "../graph/useDelib";

interface Props {
  view: "full" | "resolution";
  setView: (v: "full" | "resolution") => void;
  excludeUncoded: boolean;
  setExcludeUncoded: (v: boolean) => void;
  onReset: () => void;
  corrections: number;
  budget: BudgetSnapshot | null;
  overlays: Overlays | null;
  path: PathState;
  busy: boolean;
}

function cap(n: number | null): string {
  return n == null ? "∞" : String(n);
}

export function Toolbar({
  view, setView, excludeUncoded, setExcludeUncoded, onReset, corrections, budget, overlays, path, busy,
}: Props) {
  const loops = overlays?.loops.filter((l) => l.loop_class !== "UNDETERMINED").length ?? 0;
  const clashes = overlays?.register_clashes.length ?? 0;
  const tensions = overlays?.tradition_tensions.length ?? 0;

  return (
    <header className="flex items-center gap-4 border-b border-[var(--hairline)] bg-[var(--surface-raised)] px-4 py-2">
      <div className="font-semibold tracking-tight">
        DELIB <span className="text-[var(--ink-muted)]">· consequence map</span>
      </div>

      <div className="flex overflow-hidden rounded border border-[var(--hairline)] text-sm">
        {(["full", "resolution"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 capitalize ${
              view === v ? "bg-[var(--path-highlight)] text-white" : "text-[var(--ink-muted)]"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "resolution" && (
        <label className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
          <input
            type="checkbox"
            checked={excludeUncoded}
            onChange={(e) => setExcludeUncoded(e.target.checked)}
          />
          exclude uncoded
        </label>
      )}

      <button
        onClick={onReset}
        className="rounded border border-[var(--hairline)] px-3 py-1 text-sm hover:bg-black/5"
      >
        Reset
      </button>

      <div className="flex items-center gap-3 text-xs text-[var(--ink-muted)]">
        <span>⟳ {loops} loops</span>
        <span title="register clashes">◈ {clashes} clashes</span>
        <span title="tradition tensions">⚔ {tensions} tensions</span>
        <span>✎ {corrections} corrections</span>
        {budget && (
          <span
            title="evidence budget — OpenAlex credits · LLM dollars this session"
            className="rounded border border-[var(--hairline)] px-1.5"
          >
            ⛽ {budget.openalex_credits}/{cap(budget.openalex_credit_cap)} · $
            {budget.llm_dollars.toFixed(3)}/{cap(budget.llm_dollar_cap)}
          </span>
        )}
        {busy && <span className="animate-pulse">…</span>}
      </div>

      <div className="ml-auto">
        {path.active && path.confidence ? (
          <div className="rounded bg-[var(--path-highlight)] px-3 py-1 text-xs font-medium text-white">
            path→seed · weakest link:{" "}
            {path.confidence.weakest_grade ?? "—"} ({path.confidence.ordinal}/5) ·{" "}
            {path.confidence.path.length} hops
          </div>
        ) : (
          <div className="text-xs text-[var(--ink-muted)]">hover a node to trace its path to the seed</div>
        )}
      </div>
    </header>
  );
}
