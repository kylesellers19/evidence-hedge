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
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onHover: (id: string) => void;
  onClearHover: () => void;
}

export function GraphCanvas({
  graph,
  path,
  selectedId,
  onSelect,
  onExpand,
  onHover,
  onClearHover,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const semanticZoom = zoom < SEMANTIC_ZOOM_THRESHOLD;

  const rfNodes: Node[] = useMemo(
    () =>
      graph.nodes.map((v) => ({
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
    [graph.nodes, semanticZoom, path, selectedId],
  );

  const rfEdges: Edge[] = useMemo(() => {
    const loops = loopEdgeClasses(graph.overlays);
    return graph.edges.map((e) => {
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
          onPath,
          dimmed: path.active && !onPath,
        },
      };
    });
  }, [graph.edges, graph.overlays, path]);

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
      onPaneClick={onClearHover}
    >
      <Background gap={28} color="var(--hairline)" />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeStrokeWidth={2} maskColor="rgba(0,0,0,0.15)" />
    </ReactFlow>
  );
}
