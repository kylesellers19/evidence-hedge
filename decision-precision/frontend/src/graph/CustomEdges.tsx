import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";
import type { EdgeView } from "../api";
import { consistencyWord, gradeStroke } from "./semantics";

export interface EdgeData {
  view: EdgeView;
  loopClass?: string;
  tension?: string; // curated tradition attack: the contested proposition (hover)
  onPath: boolean;
  dimmed: boolean;
  [key: string]: unknown;
}

function label(labelX: number, labelY: number, text: string, bg: string) {
  return (
    <EdgeLabelRenderer>
      <div
        className="pointer-events-none absolute rounded px-1 text-[9px] font-bold text-white"
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          background: bg,
        }}
      >
        {text}
      </div>
    </EdgeLabelRenderer>
  );
}

/** Tradition-tension underlay: a thick deep-red stroke beneath the edge plus a
 *  hover-labeled ⚔ marker carrying the contested proposition. Visually distinct
 *  from the register-clash node ring — this is the SECOND tension layer. */
function TensionOverlay({ path, labelX, labelY, about }: {
  path: string; labelX: number; labelY: number; about: string;
}) {
  return (
    <>
      <BaseEdge path={path} style={{ stroke: "var(--tradition-tension)", strokeWidth: 6, opacity: 0.28 }} />
      <EdgeLabelRenderer>
        <div
          className="absolute cursor-help rounded px-1 text-[10px] font-bold text-white"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 12}px)`,
            background: "var(--tradition-tension)",
          }}
          title={`Tradition tension — ${about}`}
        >
          ⚔
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export function CausalEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, markerEnd } = props;
  const d = props.data as EdgeData;
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  const g = gradeStroke(d.view.evidence_grade);
  const hl = d.onPath;
  return (
    <>
      {d.tension && !d.dimmed && (
        <TensionOverlay path={path} labelX={labelX} labelY={labelY} about={d.tension} />
      )}
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: hl ? "var(--path-highlight)" : g.color,
          strokeWidth: hl ? g.width + 1 : g.width,
          strokeDasharray: g.dash,
          opacity: d.dimmed ? 0.2 : 1,
        }}
      />
      {d.view.contradicted
        ? label(labelX, labelY, "✕ contradicted", "var(--grade-contradicted)")
        : d.view.evidence_grade === "CONTESTED"
          ? label(labelX, labelY, "contested", "var(--grade-contested)")
          : d.view.evidence_grade === "ANALOGICAL"
            ? label(
                labelX,
                labelY,
                // ANALOGICAL carries its consistency direction (no vocabulary change)
                `≈ analogical${consistencyWord(d.view.evidence_consistency) ? ` (${consistencyWord(d.view.evidence_consistency)})` : ""}`,
                "var(--grade-ink)",
              )
            : null}
      {d.loopClass && d.loopClass !== "UNDETERMINED"
        ? label(
            labelX,
            labelY + 12,
            d.loopClass === "REINFORCING" ? "R ⟳" : "B ⟲",
            d.loopClass === "REINFORCING" ? "var(--reinforcing)" : "var(--balancing)",
          )
        : null}
    </>
  );
}

export function DeliberativeEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, markerEnd } = props;
  const d = props.data as EdgeData;
  const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      {d.tension && !d.dimmed && (
        <TensionOverlay path={path} labelX={labelX} labelY={labelY} about={d.tension} />
      )}
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: "var(--ink-muted)",
          strokeWidth: 1.5,
          strokeDasharray: "2 3",
          opacity: d.dimmed ? 0.2 : 0.8,
        }}
      />
    </>
  );
}

export function FramesEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY } = props;
  const d = props.data as EdgeData;
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <BaseEdge
      path={path}
      style={{
        stroke: "var(--hairline)",
        strokeWidth: 1.25,
        opacity: d.dimmed ? 0.15 : hlOpacity(d),
      }}
    />
  );
}

function hlOpacity(d: EdgeData) {
  return d.onPath ? 1 : 0.5;
}

export function ClosureEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY } = props;
  const d = props.data as EdgeData;
  // pronounced arc all the way to the center (seed); distinct teal.
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature: 0.5,
  });
  return (
    <>
      <BaseEdge
        path={path}
        style={{
          stroke: "var(--closure)",
          strokeWidth: 2.5,
          strokeDasharray: "8 4",
          opacity: d.dimmed ? 0.25 : 1,
        }}
      />
      {label(labelX, labelY, `closure: ${d.view.satisfies ?? ""}`, "var(--closure)")}
    </>
  );
}

export const edgeTypes = {
  CAUSAL: CausalEdge,
  DELIBERATIVE: DeliberativeEdge,
  CLOSURE: ClosureEdge,
  FRAMES: FramesEdge,
};
