import { useCallback, useEffect, useState } from "react";
import { api, type GraphView, type PathConfidence } from "../api";

export interface PathState {
  active: boolean;
  nodeIds: Set<string>;
  pairs: Set<string>; // "source->target"
  confidence: PathConfidence | null;
}

const EMPTY_PATH: PathState = {
  active: false,
  nodeIds: new Set(),
  pairs: new Set(),
  confidence: null,
};

export function useDelib() {
  const [graph, setGraph] = useState<GraphView | null>(null);
  const [view, setView] = useState<"full" | "resolution">("full");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [path, setPath] = useState<PathState>(EMPTY_PATH);
  const [corrections, setCorrections] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshHealth = useCallback(async () => {
    try {
      setCorrections((await api.health()).corrections);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(
    async (v: "full" | "resolution") => {
      setBusy(true);
      setError(null);
      try {
        setGraph(await api.graph(v));
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(view);
  }, [view, load]);
  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const expand = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        const g = await api.expand(id);
        // resolution view is derived; re-fetch under the active view
        setGraph(view === "full" ? g : await api.graph(view));
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy(false);
      }
    },
    [view],
  );

  const hover = useCallback(async (id: string) => {
    try {
      const { path_confidence } = await api.path(id);
      if (!path_confidence) {
        setPath({ ...EMPTY_PATH, active: true });
        return;
      }
      const ids = new Set(path_confidence.path);
      const pairs = new Set<string>();
      for (let i = 0; i < path_confidence.path.length - 1; i++) {
        pairs.add(`${path_confidence.path[i]}->${path_confidence.path[i + 1]}`);
      }
      setPath({ active: true, nodeIds: ids, pairs, confidence: path_confidence });
    } catch {
      setPath(EMPTY_PATH);
    }
  }, []);

  const clearHover = useCallback(() => setPath(EMPTY_PATH), []);

  const edit = useCallback(
    async (id: string, changes: Record<string, unknown>) => {
      try {
        await api.editNode(id, changes);
        await load(view);
        await refreshHealth();
        return true;
      } catch (e) {
        setError(String(e));
        return false;
      }
    },
    [view, load, refreshHealth],
  );

  const reset = useCallback(async () => {
    setBusy(true);
    try {
      await api.reset();
      setSelectedId(null);
      setPath(EMPTY_PATH);
      setView("full");
      setGraph(await api.graph("full"));
      await refreshHealth();
    } finally {
      setBusy(false);
    }
  }, [refreshHealth]);

  const selected =
    graph && selectedId ? graph.nodes.find((n) => n.id === selectedId) ?? null : null;

  return {
    graph,
    view,
    setView,
    selectedId,
    setSelectedId,
    selected,
    path,
    hover,
    clearHover,
    expand,
    edit,
    reset,
    corrections,
    error,
    busy,
  };
}
