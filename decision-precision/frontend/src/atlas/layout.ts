// Pure Atlas geometry helpers. CRITICAL: none of this is layout — it only FITS
// precomputed coordinates into the viewport and interpolates BETWEEN the two
// measured geometries on a toggle. No node position is ever invented here.

import type { AtlasEdge, AtlasNode, GeometryName } from "./atlasApi";

export type Pt = [number, number];

/** Fit one geometry's coords into a centered [-1,1] box, uniform scale (aspect
 *  preserved), y flipped so "up" is up. Returns id -> normalized point. */
export function normalize(nodes: AtlasNode[], geom: GeometryName): Map<string, Pt> {
  const xs = nodes.map((n) => n[geom][0]);
  const ys = nodes.map((n) => n[geom][1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = Math.max((maxX - minX) / 2, (maxY - minY) / 2) || 1;
  const out = new Map<string, Pt>();
  for (const n of nodes) {
    out.set(n.id, [(n[geom][0] - cx) / half, -(n[geom][1] - cy) / half]);
  }
  return out;
}

export function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Live-rivalry edges: joined by a negative (opposition) edge AND metrically NEAR
 *  in the ATTENTION geometry. This is disabled in the Polarity view by design —
 *  there rivals are antipodal by construction, so "near + opposed" cannot occur
 *  and the highlight would be meaningless. Returns the set of rivalry edge keys. */
export function rivalryEdgeKeys(
  edges: AtlasEdge[],
  attentionNorm: Map<string, Pt>,
  threshold: number,
): Set<string> {
  const out = new Set<string>();
  for (const e of edges) {
    if (e.type !== "EMPIRICAL_OPPOSITION" && !(e.type === "ATTACK")) continue;
    const a = attentionNorm.get(e.source);
    const b = attentionNorm.get(e.target);
    if (a && b && dist(a, b) <= threshold) out.add(edgeKey(e));
  }
  return out;
}

export function edgeKey(e: AtlasEdge): string {
  return `${e.type}:${e.source}->${e.target}`;
}

/** Each curated tradition leaf borrows a register color token for its cluster
 *  tint (halo). Unknown leaves cycle the register palette deterministically. */
const REGISTER_CYCLE = [
  "--color-register-civic",
  "--color-register-domestic",
  "--color-register-market",
  "--color-register-projective",
  "--color-register-inspired",
  "--color-register-fame",
  "--color-register-green",
  "--color-register-industrial",
];

const TRADITION_REGISTER: Record<string, string> = {
  kantian_deontological: "--color-register-civic",
  virtue_ethical: "--color-register-domestic",
  utilitarian_aggregate: "--color-register-market",
  libertarian_nozickian: "--color-register-projective",
};

export function traditionColorVar(leaf: string, index: number): string {
  const token = TRADITION_REGISTER[leaf] ?? REGISTER_CYCLE[index % REGISTER_CYCLE.length];
  return `var(${token})`;
}

export interface EdgeStyle {
  stroke: string;
  width: number;
  dash?: string;
}

export function edgeStyle(type: AtlasEdge["type"]): EdgeStyle {
  switch (type) {
    case "EMPIRICAL_OPPOSITION":
      return { stroke: "var(--atlas-opposition)", width: 0.9 };
    case "EMPIRICAL_COBELIEF":
      return { stroke: "var(--atlas-cobelief)", width: 0.9 };
    case "ATTACK":
      return { stroke: "var(--atlas-attack)", width: 2 };
    case "COMPATIBILITY":
      return { stroke: "var(--atlas-compat)", width: 1.4 };
  }
}
