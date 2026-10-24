import { useEffect, useMemo, useRef, useState } from "react";
import type { AtlasEdgeType, AtlasNode, AtlasThinker, AtlasView, GeometryName } from "./atlasApi";
import { atlasApi } from "./atlasApi";
import { AtlasControls, type EdgeVisibility } from "./AtlasControls";
import { AtlasDetail } from "./AtlasDetail";
import { edgeKey, edgeStyle, lerp, normalize, rivalryEdgeKeys, traditionColorVar } from "./layout";

const VIEWBOX = 2.5; // world [-1.25, 1.25]

/** Ease a scalar toward `target` with requestAnimationFrame. Interpolating
 *  between the two MEASURED geometries is a transition between findings, not a
 *  layout — no node position is invented. */
function useTween(target: number, ms: number): number {
  const [v, setV] = useState(target);
  const st = useRef({ from: target, raf: 0 });
  useEffect(() => {
    const s = st.current;
    s.from = v;
    const start = performance.now();
    cancelAnimationFrame(s.raf);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setV(s.from + (target - s.from) * e);
      if (t < 1) s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
    // v intentionally excluded: we snapshot it as the tween's origin.
  }, [target, ms]);
  return v;
}

export function AtlasRoute() {
  const [atlas, setAtlas] = useState<AtlasView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [geometry, setGeometry] = useState<GeometryName>("attention");
  const [edges, setEdges] = useState<EdgeVisibility>({
    EMPIRICAL_OPPOSITION: true,
    EMPIRICAL_COBELIEF: false,
    ATTACK: true,
    COMPATIBILITY: false,
  });
  const [showThinkers, setShowThinkers] = useState(false);
  const [rivalryThreshold, setRivalryThreshold] = useState(0.15);
  const [focusedTradition, setFocusedTradition] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hover, setHover] = useState<{ kind: "node" | "thinker"; id: string } | null>(null);
  const [selected, setSelected] = useState<{ kind: "node" | "thinker"; id: string } | null>(null);
  const [touched] = useState<Set<string>>(new Set()); // projection contract; empty until /project fires

  const [zoom, setZoom] = useState(1);
  const pan = useRef<[number, number]>([0, 0]);
  const [panTick, setPanTick] = useState(0); // force re-render on pan
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    atlasApi.get().then(setAtlas).catch((e) => setError(String(e)));
  }, []);

  const animT = useTween(geometry === "polarity" ? 1 : 0, 650);

  const nAtt = useMemo(() => (atlas ? normalize(atlas.nodes, "attention") : new Map()), [atlas]);
  const nPol = useMemo(() => (atlas ? normalize(atlas.nodes, "polarity") : new Map()), [atlas]);
  const nodeById = useMemo(() => {
    const m = new Map<string, AtlasNode>();
    atlas?.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [atlas]);
  const labelOf = (id: string) => nodeById.get(id)?.label ?? id;

  // rivalry only in the attention geometry (see rivalryEdgeKeys docstring)
  const rivalry = useMemo(() => {
    if (!atlas || geometry !== "attention") return new Set<string>();
    return rivalryEdgeKeys(atlas.edges, nAtt, rivalryThreshold);
  }, [atlas, geometry, nAtt, rivalryThreshold]);
  const rivalryNodes = useMemo(() => {
    const s = new Set<string>();
    atlas?.edges.forEach((e) => {
      if (rivalry.has(edgeKey(e))) {
        s.add(e.source);
        s.add(e.target);
      }
    });
    return s;
  }, [atlas, rivalry]);

  const searchLc = search.trim().toLowerCase();
  const matches = useMemo(() => {
    const s = new Set<string>();
    if (!searchLc || !atlas) return s;
    atlas.nodes.forEach((n) => {
      if (n.label.toLowerCase().includes(searchLc) || (n.tradition ?? "").includes(searchLc)) s.add(n.id);
    });
    atlas.thinkers.forEach((t) => t.label.toLowerCase().includes(searchLc) && s.add(t.id));
    return s;
  }, [searchLc, atlas]);

  if (error) {
    return (
      <div className="grid h-full place-items-center p-8 text-center text-[var(--ink-muted)]">
        Atlas unavailable: {error}
        <br />
        Is the API running, and has the Stage A cache been built?
      </div>
    );
  }
  if (!atlas) return <div className="grid h-full place-items-center text-[var(--ink-muted)]">Loading Atlas…</div>;

  const pos = (id: string): [number, number] => lerp(nAtt.get(id)!, nPol.get(id)!, animT);
  const r = 0.02 / zoom;
  const dimmed = (n: AtlasNode) =>
    (focusedTradition !== null && n.tradition !== focusedTradition) ||
    (searchLc !== "" && !matches.has(n.id)) ||
    (touched.size > 0 && !touched.has(n.id));

  const onWheel = (e: React.WheelEvent) => {
    const f = Math.exp(-e.deltaY * 0.0012);
    setZoom((z) => Math.min(12, Math.max(0.4, z * f)));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !svgRef.current) return;
    const unit = VIEWBOX / svgRef.current.clientWidth / zoom;
    pan.current[0] += (e.clientX - dragging.current.x) * unit;
    pan.current[1] += (e.clientY - dragging.current.y) * unit;
    dragging.current = { x: e.clientX, y: e.clientY };
    setPanTick((t) => t + 1);
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  const detailNode = selected?.kind === "node" ? nodeById.get(selected.id) ?? null
    : hover?.kind === "node" ? nodeById.get(hover.id) ?? null : null;
  const thinkerById = new Map(atlas.thinkers.map((t) => [t.id, t] as const));
  const detailThinker = selected?.kind === "thinker" ? thinkerById.get(selected.id) ?? null
    : hover?.kind === "thinker" ? thinkerById.get(hover.id) ?? null : null;

  void panTick; // consumed to trigger re-render on pan

  return (
    <div className="flex min-h-0 flex-1">
      <AtlasControls
        atlas={atlas}
        geometry={geometry}
        onGeometry={setGeometry}
        edges={edges}
        onToggleEdge={(t: AtlasEdgeType) => setEdges((s) => ({ ...s, [t]: !s[t] }))}
        showThinkers={showThinkers}
        onToggleThinkers={() => setShowThinkers((v) => !v)}
        rivalryThreshold={rivalryThreshold}
        onRivalryThreshold={setRivalryThreshold}
        focusedTradition={focusedTradition}
        onFocusTradition={setFocusedTradition}
        search={search}
        onSearch={setSearch}
      />

      <div className="relative min-w-0 flex-1">
        <svg
          ref={svgRef}
          className="h-full w-full touch-none select-none"
          viewBox={`${-VIEWBOX / 2} ${-VIEWBOX / 2} ${VIEWBOX} ${VIEWBOX}`}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => setSelected(null)}
        >
          <g transform={`translate(${pan.current[0]} ${pan.current[1]}) scale(${zoom})`}>
            {/* edges */}
            {atlas.edges.map((e) => {
              if (!edges[e.type]) return null;
              const a = pos(e.source);
              const b = pos(e.target);
              const isRiv = rivalry.has(edgeKey(e));
              const st = edgeStyle(e.type);
              return (
                <line
                  key={edgeKey(e)}
                  x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                  stroke={isRiv ? "var(--atlas-rivalry)" : st.stroke}
                  strokeWidth={isRiv ? st.width + 1.4 : st.width}
                  strokeOpacity={isRiv ? 0.95 : 0.5}
                  vectorEffect="non-scaling-stroke"
                >
                  {e.about && <title>{e.about}</title>}
                </line>
              );
            })}

            {/* thinker overlay */}
            {showThinkers &&
              atlas.thinkers.map((t: AtlasThinker) => {
                const c = lerp(t.attention, t.polarity, animT);
                return (
                  <g key={`th-${t.id}`}>
                    {t.edges.map((te) =>
                      nAtt.has(te.position_id) ? (
                        <line
                          key={`${t.id}-${te.position_id}`}
                          x1={c[0]} y1={c[1]}
                          x2={pos(te.position_id)[0]} y2={pos(te.position_id)[1]}
                          stroke="var(--atlas-thinker)"
                          strokeWidth={0.6}
                          strokeOpacity={0.35}
                          vectorEffect="non-scaling-stroke"
                        />
                      ) : null,
                    )}
                    <rect
                      x={c[0] - r} y={c[1] - r} width={r * 2} height={r * 2}
                      transform={`rotate(45 ${c[0]} ${c[1]})`}
                      fill="var(--atlas-thinker)"
                      onMouseEnter={() => setHover({ kind: "thinker", id: t.id })}
                      onMouseLeave={() => setHover(null)}
                      onClick={(ev) => { ev.stopPropagation(); setSelected({ kind: "thinker", id: t.id }); }}
                      style={{ cursor: "pointer" }}
                    />
                  </g>
                );
              })}

            {/* position nodes */}
            {atlas.nodes.map((n, i) => {
              const p = pos(n.id);
              const isRiv = rivalryNodes.has(n.id);
              const tint = n.tradition ? traditionColorVar(n.tradition, i) : null;
              return (
                <circle
                  key={n.id}
                  cx={p[0]} cy={p[1]} r={r}
                  fill={tint ?? "var(--atlas-node)"}
                  fillOpacity={dimmed(n) ? 0.12 : tint ? 0.9 : 0.75}
                  stroke={isRiv ? "var(--atlas-rivalry)" : tint ?? "none"}
                  strokeWidth={isRiv ? 2.5 : tint ? 1.5 : 0}
                  vectorEffect="non-scaling-stroke"
                  onMouseEnter={() => setHover({ kind: "node", id: n.id })}
                  onMouseLeave={() => setHover(null)}
                  onClick={(ev) => { ev.stopPropagation(); setSelected({ kind: "node", id: n.id }); }}
                  style={{ cursor: "pointer" }}
                />
              );
            })}

            {/* hovered/selected label */}
            {detailNode && nAtt.has(detailNode.id) && (
              <text
                x={pos(detailNode.id)[0]} y={pos(detailNode.id)[1] - r * 2}
                fontSize={0.05 / zoom} textAnchor="middle"
                fill="var(--ink)" style={{ pointerEvents: "none" }}
              >
                {detailNode.label}
              </text>
            )}
          </g>
        </svg>

        <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-[var(--ink-muted)]">
          scroll to zoom · drag to pan · coordinates are measured, never simulated
        </div>
      </div>

      <AtlasDetail
        node={detailNode}
        thinker={detailThinker}
        labelOf={labelOf}
        onClose={() => { setSelected(null); setHover(null); }}
      />
    </div>
  );
}
