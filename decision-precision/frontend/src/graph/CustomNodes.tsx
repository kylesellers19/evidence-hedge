import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeView, RegisterEngagement, TraditionAttribution } from "../api";
import { REGISTER_LABEL, confidenceOpacity, registerVar } from "./semantics";

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
  const v = d.view;
  const clash = v.register_clashes.length > 0;
  const pending = v.coding_status === "PENDING";
  return {
    d,
    v,
    clash,
    cls: [
      clash ? "register-clash" : "",
      pending ? "coding-pending" : "",
      d.dimmed ? "opacity-30" : "",
      "transition-opacity",
    ].join(" "),
    ring: d.onPath ? "0 0 0 3px var(--path-highlight)" : undefined,
  };
}

function registersOf(v: NodeView): RegisterEngagement[] {
  return (v.data.registers as RegisterEngagement[] | undefined) ?? [];
}
function traditionsOf(v: NodeView): TraditionAttribution[] {
  return (v.data.traditions as TraditionAttribution[] | undefined) ?? [];
}

/** Register chips + tradition tags, hung below the node. Confidence -> opacity.
 *  Non-interactive so clicks fall through to the node itself. */
function Attributions({ v }: { v: NodeView }) {
  const regs = registersOf(v);
  const trads = traditionsOf(v);
  const clashed = new Set(v.register_clashes.flat());
  if (!regs.length && !trads.length) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-full mt-1 flex -translate-x-1/2 flex-col items-center gap-0.5">
      {regs.length > 0 && (
        <div className="flex gap-0.5">
          {regs.map((r, i) => (
            <span
              key={i}
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{
                background: registerVar(r.register),
                opacity: confidenceOpacity(r.confidence),
                outline: clashed.has(r.register) ? "1.5px solid var(--register-clash)" : undefined,
              }}
              title={`${REGISTER_LABEL[r.register]} (${r.confidence.toLowerCase()}) — “${r.signature_marker}”`}
            />
          ))}
        </div>
      )}
      {trads.map((t, i) => (
        <span
          key={i}
          className="rounded-full border px-1 text-[8px] leading-3 text-[var(--ink-muted)]"
          style={{ borderColor: "var(--hairline)", opacity: confidenceOpacity(t.confidence) }}
          title={`${t.tradition} (${t.confidence.toLowerCase()}) — “${t.signature_marker}”`}
        >
          {t.tradition.split("_")[0]}
        </span>
      ))}
    </div>
  );
}

function CountBadge({ v }: { v: NodeView }) {
  if (!(v.halo && v.unexpanded_child_estimate)) return null;
  return (
    <div
      className="absolute -top-1 -right-1 rounded-full px-1.5 text-[10px] font-semibold leading-4 text-white"
      style={{ background: "var(--node-border)" }}
      title={`${v.unexpanded_child_estimate} hidden children — click to expand`}
    >
      {v.unexpanded_child_estimate}
    </div>
  );
}

function PendingBadge({ v }: { v: NodeView }) {
  if (v.coding_status !== "PENDING") return null;
  return (
    <div
      className="absolute -bottom-1 -left-1 rounded-full px-1 text-[9px] font-bold leading-4 text-white"
      style={{ background: "var(--coding-pending)" }}
      title="Coding pending — not yet human-verified"
    >
      ⋯
    </div>
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
      <CountBadge v={v} />
      <PendingBadge v={v} />
      <CenterHandles />
    </div>
  );
}

export function ConsequenceNode({ data }: NodeProps) {
  const { v, cls, ring, d } = useCommon(data);
  return (
    <div className={`relative ${cls} ${v.halo ? "node-halo" : ""}`}>
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full border-2 p-2 text-center text-[11px] font-medium leading-tight"
        style={{
          background: "var(--node-consequence)",
          borderColor: "var(--node-border)",
          color: "var(--ink)",
          boxShadow: ring,
        }}
        title={v.label}
      >
        {d.semanticZoom ? "" : v.label}
      </div>
      <CountBadge v={v} />
      <PendingBadge v={v} />
      <Attributions v={v} />
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
