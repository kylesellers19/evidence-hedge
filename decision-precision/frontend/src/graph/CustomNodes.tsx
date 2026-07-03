import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeView } from "../api";
import { dominantValence, valenceVar } from "./semantics";

export interface NodeData {
  view: NodeView;
  semanticZoom: boolean;
  onPath: boolean;
  dimmed: boolean;
  [key: string]: unknown;
}

// invisible center handles so edges connect center-to-center (radial routing)
function CenterHandles() {
  const s = { opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1, border: "none", background: "transparent" } as const;
  return (
    <>
      <Handle type="target" position={Position.Top} style={s} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={s} isConnectable={false} />
    </>
  );
}

function useCommon(data: unknown) {
  const d = data as NodeData;
  return {
    d,
    v: d.view,
    cls: [
      d.view.is_divergence ? "divergence-glow" : "",
      d.dimmed ? "opacity-30" : "",
      "transition-opacity",
    ].join(" "),
    ring: d.onPath ? "0 0 0 3px var(--path-highlight)" : undefined,
  };
}

function Badges({ v }: { v: NodeView }) {
  return (
    <>
      {v.halo && v.unexpanded_child_estimate ? (
        <div
          className="absolute -top-1 -right-1 rounded-full px-1.5 text-[10px] font-semibold leading-4 text-white"
          style={{ background: "var(--node-border)" }}
          title={`${v.unexpanded_child_estimate} hidden children — click to expand`}
        >
          {v.unexpanded_child_estimate}
        </div>
      ) : null}
      {v.is_divergence ? (
        <div
          className="absolute -bottom-1 -left-1 rounded-full px-1 text-[9px] font-bold leading-4 text-white"
          style={{ background: "var(--divergence)" }}
          title={`Divergence: ${v.divergence_kinds.join(", ")}`}
        >
          ⚡
        </div>
      ) : null}
    </>
  );
}

export function SeedNode({ data }: NodeProps) {
  const { v, cls, ring } = useCommon(data);
  return (
    <div className={`relative ${cls}`}>
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-[10px] font-bold text-[var(--surface)]"
        style={{ background: "var(--seed)", boxShadow: ring }}
        title={v.label}
      >
        SEED
      </div>
      <CenterHandles />
    </div>
  );
}

export function DecisionNode({ data }: NodeProps) {
  const { v, cls, ring, d } = useCommon(data);
  return (
    <div className={`relative ${cls} ${v.halo ? "node-halo" : ""}`}>
      <div
        className="flex h-16 w-32 items-center justify-center rounded-md border-2 px-2 text-center text-xs font-medium"
        style={{
          background: "var(--node-decision)",
          borderColor: "var(--node-border)",
          color: "var(--ink)",
          boxShadow: ring,
        }}
        title={v.label}
      >
        {d.semanticZoom ? "" : v.label}
      </div>
      <Badges v={v} />
      <CenterHandles />
    </div>
  );
}

export function ConsequenceNode({ data }: NodeProps) {
  const { v, cls, ring, d } = useCommon(data);
  const dom = dominantValence(v);
  const fill = dom === null ? "var(--node-consequence)" : valenceVar(dom);
  const textOnFill = dom !== null && dom !== 0 ? "#ffffff" : "var(--ink)";
  return (
    <div className={`relative ${cls} ${v.halo ? "node-halo" : ""}`}>
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full border-2 p-2 text-center text-[11px] font-medium leading-tight"
        style={{
          background: fill,
          borderColor: "var(--node-border)",
          color: textOnFill,
          boxShadow: ring,
        }}
        title={v.label}
      >
        {d.semanticZoom ? "" : v.label}
      </div>
      <Badges v={v} />
      <CenterHandles />
    </div>
  );
}

export function StateNode({ data }: NodeProps) {
  const { v, cls, ring, d } = useCommon(data);
  return (
    <div className={`relative ${cls}`}>
      <div
        className="flex h-20 w-20 rotate-45 items-center justify-center border-2"
        style={{ background: "var(--node-consequence)", borderColor: "var(--node-border)", boxShadow: ring }}
        title={v.label}
      >
        <span className="-rotate-45 px-1 text-center text-[10px]" style={{ color: "var(--ink)" }}>
          {d.semanticZoom ? "" : v.label}
        </span>
      </div>
      <CenterHandles />
    </div>
  );
}

export const nodeTypes = {
  SEED: SeedNode,
  DECISION: DecisionNode,
  CONSEQUENCE: ConsequenceNode,
  STATE: StateNode,
};
