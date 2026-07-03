// Typed client + types mirroring the backend GraphView payload (serialize.py).

export type NodeType = "SEED" | "DECISION" | "CONSEQUENCE" | "STATE";
export type EdgeType = "CAUSAL" | "DELIBERATIVE" | "CLOSURE" | "FRAMES";
export type EvidenceGrade =
  | "SUPPORTED"
  | "WEAK"
  | "CONTESTED"
  | "CONTRADICTED"
  | "ANALOGICAL"
  | "SPECULATIVE";

export interface NodeView {
  id: string;
  type: NodeType;
  label: string;
  ring: number;
  x: number;
  y: number;
  angle: number;
  expanded: boolean | null;
  unexpanded_child_estimate: number | null;
  halo: boolean;
  goal_relevance: number | null;
  is_divergence: boolean;
  divergence_kinds: string[];
  on_resolution_path: boolean;
  data: Record<string, unknown>;
}

export interface EdgeView {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  evidence_grade: EvidenceGrade | null;
  polarity: number | null;
  satisfies: string | null;
  justification: string | null;
  mechanism_text: string | null;
  contradicted: boolean;
  on_resolution_path: boolean;
}

export interface LoopOverlay {
  nodes: string[];
  loop_class: "REINFORCING" | "BALANCING" | "UNDETERMINED";
  polarity_product: number;
}

export interface DivergencePoint {
  node_id: string;
  kind: "across_frameworks" | "across_stakeholders";
  fixed_id: string;
  signs: Record<string, number>;
}

export interface Overlays {
  divergence: {
    across_frameworks: DivergencePoint[];
    across_stakeholders: DivergencePoint[];
  };
  loops: LoopOverlay[];
  burden_index: Record<string, number>;
  resolution_node_ids: string[];
  closures: { source: string; satisfies: string }[];
}

export interface GraphView {
  view: "full" | "resolution";
  nodes: NodeView[];
  edges: EdgeView[];
  overlays: Overlays;
}

export interface PathConfidence {
  source: string;
  target: string;
  path: string[];
  weakest_grade: EvidenceGrade | null;
  ordinal: number;
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  graph: (view: "full" | "resolution" = "full") =>
    fetch(`/api/graph?view=${view}`).then((r) => j<GraphView>(r)),

  reset: () =>
    fetch(`/api/session/reset`, { method: "POST" }).then((r) => j<GraphView>(r)),

  expand: (nodeId: string) =>
    fetch(`/api/nodes/${encodeURIComponent(nodeId)}/expand`, { method: "POST" }).then(
      (r) => j<GraphView>(r),
    ),

  path: (nodeId: string) =>
    fetch(`/api/nodes/${encodeURIComponent(nodeId)}/path`).then(
      (r) => j<{ path_confidence: PathConfidence | null }>(r),
    ),

  editNode: (nodeId: string, changes: Record<string, unknown>) =>
    fetch(`/api/nodes/${encodeURIComponent(nodeId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
    }).then((r) => j<NodeView>(r)),

  health: () =>
    fetch(`/api/health`).then((r) =>
      j<{ ok: boolean; nodes: number; corrections: number }>(r),
    ),
};
