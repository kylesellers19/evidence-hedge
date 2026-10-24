import type { AtlasNode, AtlasThinker } from "./atlasApi";

interface Props {
  node: AtlasNode | null;
  thinker: AtlasThinker | null;
  labelOf: (id: string) => string;
  onClose: () => void;
}

function rColor(r: number): string {
  return r < 0 ? "var(--atlas-opposition)" : "var(--atlas-cobelief)";
}

export function AtlasDetail({ node, thinker, labelOf, onClose }: Props) {
  if (!node && !thinker) return null;
  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-[var(--hairline)] bg-[var(--surface-raised)] p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold leading-tight">
          {node ? node.label : thinker!.label}
        </h2>
        <button onClick={onClose} className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
          ✕
        </button>
      </div>

      {node && (
        <>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            {node.tradition ? `tradition: ${node.tradition}` : "position"}
          </p>
          <div className="mt-3 font-medium">Strongest correlations</div>
          {node.neighbors.length === 0 && (
            <p className="text-xs text-[var(--ink-muted)]">none in the position matrix</p>
          )}
          <ul className="mt-1 space-y-1">
            {node.neighbors.map((nb) => (
              <li key={nb.id} className="flex items-center gap-2 text-xs">
                <span
                  className="w-10 shrink-0 text-right font-mono"
                  style={{ color: rColor(nb.r) }}
                >
                  {nb.r >= 0 ? "+" : ""}
                  {nb.r.toFixed(2)}
                </span>
                <span className="truncate">{labelOf(nb.id)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {thinker && (
        <>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            bridge thinker · centroid of {thinker.edges.length}+ positions
          </p>
          <div className="mt-3 font-medium">Top identifications</div>
          <ul className="mt-1 space-y-1">
            {thinker.edges.map((e) => (
              <li key={e.position_id} className="flex items-center gap-2 text-xs">
                <span
                  className="w-10 shrink-0 text-right font-mono"
                  style={{ color: rColor(e.r) }}
                >
                  {e.r >= 0 ? "+" : ""}
                  {e.r.toFixed(2)}
                </span>
                <span className="truncate">{labelOf(e.position_id)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
