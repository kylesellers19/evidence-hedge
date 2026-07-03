// Meaning -> token variables. The ONLY place semantic colors are decided;
// everything else references the CSS variables this returns.

import type { EdgeView, EvidenceGrade, NodeView, Overlays } from "../api";

/** CSS var for a valence sign in [-2, 2]. */
export function valenceVar(sign: number): string {
  const s = Math.max(-2, Math.min(2, Math.round(sign)));
  return {
    [-2]: "var(--valence-neg2)",
    [-1]: "var(--valence-neg1)",
    [0]: "var(--valence-0)",
    [1]: "var(--valence-pos1)",
    [2]: "var(--valence-pos2)",
  }[s]!;
}

interface ValenceLike {
  sign: number;
}

/** Dominant valence of a consequence = clamped sum of its valence signs.
 *  null when the node carries no valences (e.g. decisions). */
export function dominantValence(node: NodeView): number | null {
  const vs = (node.data?.valences as ValenceLike[] | undefined) ?? [];
  if (!vs.length) return null;
  const sum = vs.reduce((a, v) => a + (v.sign ?? 0), 0);
  return Math.max(-2, Math.min(2, sum));
}

/** Edge stroke semantics: color + dash + width. Confidence is shown by line
 *  style (solid SUPPORTED -> increasingly dashed), hue is reserved for the two
 *  status grades (CONTESTED amber, CONTRADICTED red). */
export function gradeStroke(grade: EvidenceGrade | null): {
  color: string;
  dash: string | undefined;
  width: number;
} {
  switch (grade) {
    case "SUPPORTED":
      return { color: "var(--grade-ink)", dash: undefined, width: 2 };
    case "WEAK":
      return { color: "var(--grade-ink)", dash: "6 4", width: 1.75 };
    case "ANALOGICAL":
      return { color: "var(--grade-ink)", dash: "2 4", width: 1.75 };
    case "SPECULATIVE":
      return { color: "var(--grade-ink)", dash: "1 5", width: 1.5 };
    case "CONTESTED":
      return { color: "var(--grade-contested)", dash: "6 4", width: 2 };
    case "CONTRADICTED":
      return { color: "var(--grade-contradicted)", dash: "6 3", width: 2.5 };
    default:
      return { color: "var(--grade-ink)", dash: undefined, width: 1.5 };
  }
}

export const GRADE_LABEL: Record<EvidenceGrade, string> = {
  SUPPORTED: "Supported",
  WEAK: "Weak",
  CONTESTED: "Contested",
  CONTRADICTED: "Contradicted",
  ANALOGICAL: "Analogical",
  SPECULATIVE: "Speculative",
};

/** Map each edge id to the loop class of the cycle it belongs to (if any). */
export function loopEdgeClasses(overlays: Overlays): Map<string, string> {
  const out = new Map<string, string>();
  for (const loop of overlays.loops) {
    const cyc = loop.nodes;
    for (let i = 0; i < cyc.length; i++) {
      const a = cyc[i];
      const b = cyc[(i + 1) % cyc.length];
      out.set(`CAUSAL:${a}->${b}`, loop.loop_class);
    }
  }
  return out;
}

/** Quick lookup of an edge's "is on a highlighted path" state. */
export function edgeKey(e: EdgeView): string {
  return e.id;
}
