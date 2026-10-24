// Typed client for /api/atlas — mirrors backend layer2/survey/atlas.py (AtlasView).
// The Atlas receives PRECOMPUTED coordinates; the renderer never lays out nodes.

export type GeometryName = "attention" | "polarity";
export type AtlasEdgeType =
  | "EMPIRICAL_OPPOSITION"
  | "EMPIRICAL_COBELIEF"
  | "ATTACK"
  | "COMPATIBILITY";

export interface AtlasNeighbor {
  id: string;
  r: number;
}

export interface AtlasNode {
  id: string;
  label: string;
  attention: [number, number];
  polarity: [number, number];
  tradition: string | null;
  neighbors: AtlasNeighbor[];
}

export interface AtlasEdge {
  source: string;
  target: string;
  type: AtlasEdgeType;
  r: number | null;
  about: string | null;
}

export interface AtlasGeometry {
  name: GeometryName;
  variance: number[];
}

export interface AtlasTradition {
  id: string;
  member_ids: string[];
}

export interface AtlasThinkerEdge {
  position_id: string;
  r: number;
}

export interface AtlasThinker {
  id: string;
  label: string;
  attention: [number, number];
  polarity: [number, number];
  edges: AtlasThinkerEdge[];
}

export interface AtlasView {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  geometries: AtlasGeometry[];
  traditions: AtlasTradition[];
  thinkers: AtlasThinker[];
  n_positions: number;
  n_pairs: number;
  density: number;
}

export interface ProjectResponse {
  graph_id: string;
  touched_node_ids: string[];
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const atlasApi = {
  get: () => fetch(`/api/atlas`).then((r) => j<AtlasView>(r)),

  // The projection contract exists so the convergence demo is a data change, not
  // a rebuild. Nothing calls this yet; the backend stub returns [].
  project: (graphId: string) =>
    fetch(`/api/atlas/project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph_id: graphId }),
    }).then((r) => j<ProjectResponse>(r)),
};
