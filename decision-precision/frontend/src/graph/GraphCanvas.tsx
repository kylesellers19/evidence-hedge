import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { GraphView } from "../api";
import { nodeTypes } from "./CustomNodes";
import { edgeTypes } from "./CustomEdges";
import { loopEdgeClasses } from "./semantics";
import type { PathState } from "./useDelib";

const SEMANTIC_ZOOM_THRESHOLD = 0.55;

interface Props {
  graph: GraphView;
  path: PathState;
  selectedId: string | null;
  excludeUncoded: boolean;
  onSelect: (id: string) => void;
  onSelectEdge: (id: string) => void;
  onExpand: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: () => void;
}

export function GraphCanvas({
  graph,
  path,
  selectedId,
  excludeUncoded,
  onSelect,
  onSelectEdge,
  onExpand,
  onHover,
  onClearHover,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const semanticZoom = zoom < SEMANTIC_ZOOM_THRESHOLD;

  // exclude-uncoded (resolution view): drop PENDING nodes and their edges.
  const visibleNodes = useMemo(
    () => (excludeUncoded ? graph.nodes.filter((n) => n.coding_status !== "PENDING") : graph.nodes),
    [graph.nodes, excludeUncoded],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const rfNodes: Node[] = useMemo(
    () =>
      visibleNodes.map((v) => ({
        id: v.id,
        type: v.type,
        position: { x: v.x, y: v.y },
        selected: v.id === selectedId,
        data: {
          view: v,
          semanticZoom,
          onPath: path.active && path.nodeIds.has(v.id),
          dimmed: path.active && !path.nodeIds.has(v.id),
        },
      })),
    [visibleNodes, semanticZoom, path, selectedId],
  );

  const rfEdges: Edge[] = useMemo(() => {
    const loops = loopEdgeClasses(graph.overlays);
    const tensionAbout = new Map(
      graph.overlays.tradition_tensions.map((t) => [`${t.source}->${t.target}`, t.about] as const),
    );
    return graph.edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => {
        const onPath = path.active && path.pairs.has(`${e.source}->${e.target}`);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          markerEnd:
            e.type === "FRAMES"
              ? undefined
              : { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#94a3b8" },
          data: {
            view: e,
            loopClass: loops.get(e.id),
            tension: tensionAbout.get(`${e.source}->${e.target}`),
            onPath,
            dimmed: path.active && !onPath,
          },
        };
      });
  }, [graph.edges, graph.overlays, path, visibleIds]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodeOrigin={[0.5, 0.5]}
      fitView
      minZoom={0.15}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      onMove={(_, vp) => setZoom(vp.zoom)}
      onInit={(inst) => setZoom(inst.getZoom())}
      onNodeClick={(_, n) => {
        onSelect(n.id);
        const v = graph.nodes.find((x) => x.id === n.id);
        if (v && v.expanded === false) onExpand(n.id);
      }}
      onNodeMouseEnter={(_, n) => onHover(n.id)}
      onNodeMouseLeave={onClearHover}
      onEdgeClick={(_, e) => onSelectEdge(e.id)}
      onPaneClick={onClearHover}
    >
      <Background gap={28} color="var(--hairline)" />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeStrokeWidth={2} maskColor="rgba(0,0,0,0.15)" />
    </ReactFlow>
  );
}
