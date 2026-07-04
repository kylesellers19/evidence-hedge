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

export type Register =
  | "MARKET"
  | "INDUSTRIAL"
  | "CIVIC"
  | "DOMESTIC"
  | "INSPIRED"
  | "FAME"
  | "GREEN"
  | "PROJECTIVE";
export type Confidence = "HIGH" | "MODERATE" | "LOW";
export type CodingStatus = "PENDING" | "HUMAN_VERIFIED";
export type EffectType =
  | "FINANCIAL"
  | "HEALTH"
  | "WELFARE"
  | "ACCESS"
  | "DISPLACEMENT"
  | "OTHER";

export interface DistributionalEffect {
  stakeholder_id: string;
  effect_type: EffectType;
  direction: -1 | 1;
  magnitude_note: string;
  evidence_claim_ref: string | null;
}

export interface RegisterEngagement {
  register: Register;
  signature_marker: string;
  justification: string;
  confidence: Confidence;
}

export interface TraditionAttribution {
  tradition: string;
  signature_marker: string;
  justification: string;
  confidence: Confidence;
}

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
  coding_status: CodingStatus | null;
  register_clashes: [Register, Register][];
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

export interface RegisterClash {
  node_id: string;
  register_a: Register;
  register_b: Register;
}

export interface TraditionTension {
  source: string;
  target: string;
  tradition_a: string;
  tradition_b: string;
  about: string;
}

export interface Overlays {
  register_clashes: RegisterClash[];
  tradition_tensions: TraditionTension[];
  burden_index: Record<string, number>;
  loops: LoopOverlay[];
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
