import type { AtlasEdgeType, AtlasTradition, AtlasView, GeometryName } from "./atlasApi";
import { traditionColorVar } from "./layout";

export interface EdgeVisibility {
  EMPIRICAL_OPPOSITION: boolean;
  EMPIRICAL_COBELIEF: boolean;
  ATTACK: boolean;
  COMPATIBILITY: boolean;
}

const EDGE_LABELS: Record<AtlasEdgeType, string> = {
  EMPIRICAL_OPPOSITION: "Opposition (empirical)",
  EMPIRICAL_COBELIEF: "Co-belief (empirical)",
  ATTACK: "Attack (curated)",
  COMPATIBILITY: "Compatibility (curated)",
};

const EDGE_SWATCH: Record<AtlasEdgeType, string> = {
  EMPIRICAL_OPPOSITION: "var(--atlas-opposition)",
  EMPIRICAL_COBELIEF: "var(--atlas-cobelief)",
  ATTACK: "var(--atlas-attack)",
  COMPATIBILITY: "var(--atlas-compat)",
};

const TRADITION_LABELS: Record<string, string> = {
  kantian_deontological: "Kantian / deontological",
  virtue_ethical: "Virtue-ethical",
  utilitarian_aggregate: "Utilitarian",
  libertarian_nozickian: "Libertarian",
};

interface Props {
  atlas: AtlasView;
  geometry: GeometryName;
  onGeometry: (g: GeometryName) => void;
  edges: EdgeVisibility;
  onToggleEdge: (t: AtlasEdgeType) => void;
  showThinkers: boolean;
  onToggleThinkers: () => void;
  rivalryThreshold: number;
  onRivalryThreshold: (v: number) => void;
  focusedTradition: string | null;
  onFocusTradition: (leaf: string | null) => void;
  search: string;
  onSearch: (v: string) => void;
}

function variance(atlas: AtlasView, geom: GeometryName): string {
  const g = atlas.geometries.find((x) => x.name === geom);
  if (!g) return "";
  return g.variance.map((v) => `${(v * 100).toFixed(1)}%`).join(" · ");
}

export function AtlasControls(p: Props) {
  const rivalryDisabled = p.geometry === "polarity";
  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-r border-[var(--hairline)] bg-[var(--surface-raised)] p-4 text-sm">
      <h2 className="text-base font-semibold">Atlas</h2>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        {p.atlas.n_positions} positions · {p.atlas.n_pairs} pairs · density{" "}
        {p.atlas.density.toFixed(3)}
      </p>

      {/* Geometry toggle — a first-class control */}
      <div className="mt-4">
        <div className="font-medium">Geometry</div>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-[var(--surface)] p-1">
          {(["attention", "polarity"] as GeometryName[]).map((g) => (
            <button
              key={g}
              onClick={() => p.onGeometry(g)}
              className={`rounded px-2 py-1 text-xs capitalize transition-colors ${
                p.geometry === g
                  ? "bg-[var(--path-highlight)] text-white"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] leading-tight text-[var(--ink-muted)]">
          {p.geometry === "attention"
            ? "|r|-metric MDS — rivals sit near (shared attention)."
            : "signed PCA — rivals sit antipodal (polarity)."}{" "}
          Var: {variance(p.atlas, p.geometry)}
        </p>
      </div>

      {/* Edge layers */}
      <div className="mt-4">
        <div className="font-medium">Edge layers</div>
        {(Object.keys(EDGE_LABELS) as AtlasEdgeType[]).map((t) => (
          <label key={t} className="mt-1.5 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={p.edges[t]} onChange={() => p.onToggleEdge(t)} />
            <span
              className="inline-block h-2 w-4 rounded-sm"
              style={{ background: EDGE_SWATCH[t] }}
            />
            {EDGE_LABELS[t]}
          </label>
        ))}
      </div>

      {/* Rivalry highlight (attention only) */}
      <div className="mt-4">
        <div className="font-medium">
          Rivalry highlight
          {rivalryDisabled && (
            <span className="ml-1 text-[10px] font-normal text-[var(--ink-muted)]">
              (attention only)
            </span>
          )}
        </div>
        <input
          type="range"
          min={0.02}
          max={0.4}
          step={0.01}
          value={p.rivalryThreshold}
          disabled={rivalryDisabled}
          onChange={(e) => p.onRivalryThreshold(Number(e.target.value))}
          className="mt-1 w-full disabled:opacity-40"
        />
        <p className="text-[11px] text-[var(--ink-muted)]">
          near (≤ {p.rivalryThreshold.toFixed(2)}) + negative edge = live rivalry
        </p>
      </div>

      {/* Philosopher overlay */}
      <div className="mt-4">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={p.showThinkers} onChange={p.onToggleThinkers} />
          Philosophers ({p.atlas.thinkers.length})
        </label>
        <p className="text-[11px] text-[var(--ink-muted)]">
          bridge thinkers at the weighted centroid of their positions
        </p>
      </div>

      {/* Tradition legend / focus */}
      {p.atlas.traditions.length > 0 && (
        <div className="mt-4">
          <div className="font-medium">Traditions</div>
          {p.atlas.traditions.map((tr: AtlasTradition, i) => {
            const active = p.focusedTradition === tr.id;
            return (
              <button
                key={tr.id}
                onClick={() => p.onFocusTradition(active ? null : tr.id)}
                className={`mt-1.5 flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs ${
                  active ? "bg-[var(--surface)]" : ""
                }`}
              >
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: traditionColorVar(tr.id, i) }}
                />
                <span className={active ? "font-medium" : ""}>
                  {TRADITION_LABELS[tr.id] ?? tr.id}
                </span>
                <span className="ml-auto text-[var(--ink-muted)]">{tr.member_ids.length}</span>
              </button>
            );
          })}
          {p.focusedTradition && (
            <button
              onClick={() => p.onFocusTradition(null)}
              className="mt-1 text-[11px] text-[var(--path-highlight)]"
            >
              clear focus
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mt-4">
        <div className="font-medium">Search</div>
        <input
          value={p.search}
          onChange={(e) => p.onSearch(e.target.value)}
          placeholder="position / tradition / philosopher"
          className="mt-1 w-full rounded border border-[var(--hairline)] bg-[var(--surface)] px-2 py-1 text-xs"
        />
      </div>
    </aside>
  );
}
