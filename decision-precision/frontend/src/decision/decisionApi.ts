// Typed client for /api/decision (backend: delib/decision). Types cover the
// fields the Decision route renders; the full shape is docs/decision-model.schema.json.

export type StepState = "EMPTY" | "PARTIAL" | "COMPLETE";
export type Quadrant = "INVESTIGATE" | "MONITOR" | "TOLERATE" | "SETTLED";
export type DisagreementKind = "FACTUAL" | "VALUE" | "FRAME" | "HETEROGENEITY";

export interface EdgeRef { source: string; target: string }
export interface CellRef { alternative_id: string; objective_id: string }
export interface Estimate { p05: number; p50: number; p95: number; method: string; source_note?: string | null }

export interface Attribute {
  name: string; unit: string; kind: string; direction: "MAXIMIZE" | "MINIMIZE";
  worst: number; best: number; value_points?: [number, number][] | null;
}
export interface Objective {
  id: string; label: string; kind: "FUNDAMENTAL" | "MEANS"; parent_id?: string | null; serves: string[];
  attribute?: Attribute | null; role: "COMPENSATORY" | "CONSTRAINT"; threshold?: number | null;
  registers: string[]; consequence_ids: string[]; statement_ids: string[];
}
export interface Alternative { id: string; label: string; kind: "ACTION" | "STATUS_QUO" | "DEFER"; choices: Record<string, string> }
export interface UserGroup { id: string; label: string; description?: string | null }
export interface Interview { id: string; group_id: string; mode: string; redaction_confirmed: boolean; individual_first?: boolean | null }
export interface Statement {
  id: string; interview_id: string; quote: string; type: string; coded_by: string; verified: boolean;
  objective_id?: string | null; alternative_id?: string | null; edge?: EdgeRef | null; node_id?: string | null;
  polarity?: number | null; population?: string | null;
}
export interface EdgeCard {
  edge: EdgeRef; basis: string[]; causal_form: string; transport: string; confounder_prompt_answered: boolean;
  confounders: { name: string; status: string }[]; group_effects: { group_id: string; direction: number }[];
}
export interface Cell { alternative_id: string; objective_id: string; estimate?: Estimate | null; basis_edges: EdgeRef[] }
export interface Assumption {
  id: string; text: string; vulnerable?: boolean | null;
  signposts: { id: string; indicator: string; threshold: string }[];
  shaping_actions: string[]; hedging_actions: string[];
}
export interface DecisionRecord {
  chosen_alternative_id: string; decided_by: string; decided_on?: string | null; rationale: string;
  positions: { group_id: string; preferred_alternative_id?: string | null; dissent_note?: string | null }[];
  premortem: { failure_story: string; mitigation?: string | null }[]; analysis_hash?: string | null;
}
export interface DecisionModel {
  frame: {
    decision_statement: string; owner: string; seed_id?: string | null; beneficiary?: string | null;
    expertise: string[]; affected_not_involved: string[]; givens: string[]; focus: string[]; deferred: string[];
    horizon?: string | null; questions: { text: string; kind?: string | null; confirmed: boolean; suggested_by: string }[];
  };
  groups: UserGroup[]; interviews: Interview[]; statements: Statement[]; objectives: Objective[];
  alternatives: Alternative[]; edge_cards: EdgeCard[]; cells: Cell[];
  weights: { group_id: string; points: Record<string, number>; preferential_independence_checked: boolean }[];
  assumptions: Assumption[]; record?: DecisionRecord | null;
  [k: string]: unknown;
}

export interface StepStatus { number: number; name: string; state: StepState; summary: string; gaps: string[]; grounding: string }
export interface RankedAlternative { alternative_id: string; value: number; rank: number; at_risk: boolean }
export interface GroupRanking { group_id: string; weights: Record<string, number>; ranked: RankedAlternative[]; top: string; margin: number; preferential_independence_checked: boolean }
export interface PrecisionRow { cell: CellRef; kind: string; sensitive_groups: string[]; max_evppi: number; floor_grade: string | null; adequate: boolean; quadrant: Quadrant; flags: string[] }
export interface Disagreement { kind: DisagreementKind; subject: string; groups: string[]; route_to_step: number; decision_relevant: boolean | null; detail: string; statement_ids: string[] }
export interface RatificationRow { constant: string; value: string; status: string; rationale: string }

export interface DecisionAnalysis {
  engine_version: string;
  analysis_hash: string;
  graph_issues: { step: number; ref: string; message: string }[];
  question_suggestions: { text: string; kind: string | null; pattern: string | null; matched: string | null }[];
  partition: { values: string[]; facts: string[]; options: string[]; out_of_frame: string[]; unlinked: string[] };
  elicitation_gaps: string[];
  objectives: { leaves: string[]; compensatory: string[]; constraints: string[]; raised_by: Record<string, string[]>; register_gaps: { register: string; consequence_ids: string[] }[]; gaps: string[] };
  strategy_table: { dimensions: { node_id: string; label: string; options: string[] }[]; rows: { alternative_id: string; label: string; kind: string; choices: Record<string, string> }[]; gaps: string[] };
  influence_diagram: { decision_nodes: string[]; chance_nodes: string[]; value_nodes: string[]; relevant_nodes: string[]; relevant_edges: EdgeRef[]; cycles: { nodes: string[]; treatment: string | null }[]; gaps: string[] };
  edge_gaps: { edge: EdgeRef; gaps: string[] }[];
  backdoor: { edge: EdgeRef; computable: boolean; adjustment_set: string[] | null; note: string }[];
  missing_cells: [string, string][];
  screen: { alternative_id: string; status: string; checks: { objective_id: string; threshold: number; p50: number | null; status: string }[] }[];
  dominance: { dominated: string; by: string; kind: string }[];
  rankings: GroupRanking[];
  even_swaps: { group_id: string; applied: string[]; checks: { swap_id: string; implied_ratio: number | null; elicited_ratio: number | null; consistent: boolean | null }[] }[];
  weight_stability: { group_id: string; objective_id: string; current: number; lo: number; hi: number; takeover_at_lo: string | null; takeover_at_hi: string | null; sensitive: boolean }[];
  tornado: { group_id: string; cell: CellRef; kind: string; swing: number; flips: boolean; top_at_low: string | null; top_at_high: string | null }[];
  voi: { group_id: string; evpi: number | null; top_under_expectation: string; cells: { cell: CellRef; evppi: number }[] }[];
  precision: PrecisionRow[];
  disagreements: Disagreement[];
  assumptions: { assumption_id: string; load_bearing: boolean; reasons: string[]; gaps: string[] }[];
  assumption_candidates: { cell: CellRef; edge: EdgeRef | null; text: string; why: string[] }[];
  decision_quality: { element: string; ok: boolean; checks: { check: string; ok: boolean; detail: string | null }[] }[];
  steps: StepStatus[];
  ratification: RatificationRow[];
}

export interface CellTrace {
  alternative_id: string; objective_id: string; attribute: string | null; unit: string | null;
  estimate: Estimate | null; value_p50: number | null;
  floor: { grade: string | null; untraced: boolean; elicited_only: string[]; transport_gaps: string[] };
  edges: { edge: EdgeRef; mechanism_text: string | null; evidence_grade: string | null; citation_count: number; basis: string[]; transport: string | null; statements: { id: string; group_id: string; type: string; quote: string }[] }[];
  statements: { id: string; group_id: string; type: string; quote: string }[];
}

export interface PooledRanking { label: string; rule: string; shares: Record<string, number>; weights: Record<string, number>; ranked: RankedAlternative[] }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    } catch { /* non-JSON error body */ }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const decisionApi = {
  get: () => call<{ model: DecisionModel | null; analysis_hash: string | null }>("/api/decision"),
  create: (decision_statement: string, owner: string) =>
    call<{ model: DecisionModel }>("/api/decision/new", { method: "POST", body: JSON.stringify({ decision_statement, owner }) }),
  replace: (model: unknown) => call<{ model: DecisionModel }>("/api/decision", { method: "PUT", body: JSON.stringify(model) }),
  clear: () => call<{ model: null }>("/api/decision", { method: "DELETE" }),
  analysis: () => call<DecisionAnalysis>("/api/decision/analysis"),
  trace: (a: string, o: string) =>
    call<CellTrace>(`/api/decision/trace?alternative_id=${encodeURIComponent(a)}&objective_id=${encodeURIComponent(o)}`),
  pooled: () => call<PooledRanking>("/api/decision/pooled", { method: "POST", body: JSON.stringify({ shares: null }) }),
};
