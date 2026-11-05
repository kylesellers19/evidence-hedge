import { useState, type ReactNode } from "react";
import {
  decisionApi,
  type CellTrace,
  type DecisionAnalysis,
  type DecisionModel,
  type PooledRanking,
  type Quadrant,
} from "./decisionApi";

// --- small building blocks ---------------------------------------------------

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-[var(--ink-muted)]">{empty ?? "None yet."}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--hairline)] text-[var(--ink-muted)]">
            {head.map((h) => <th key={h} className="py-1.5 pr-4 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--hairline)] align-top last:border-0">
              {r.map((c, j) => <td key={j} className="py-1.5 pr-4">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Gaps({ gaps }: { gaps: string[] }) {
  if (!gaps.length) return <p className="text-sm text-[var(--ink-muted)]">No gaps.</p>;
  return (
    <ul className="space-y-1 text-[13px]">
      {gaps.map((g, i) => (
        <li key={i} className="border-l-2 border-[var(--grade-contested)] pl-2">{g}</li>
      ))}
    </ul>
  );
}

const fmt = (n: number | null | undefined, d = 1) => (n === null || n === undefined ? "—" : n.toFixed(d));
const yes = (b: boolean | null | undefined) => (b === null || b === undefined ? "not recorded" : b ? "yes" : "no");
const cellKey = (a: string, o: string) => `${a}|${o}`;

// --- step 10's quadrant -------------------------------------------------------

const QUAD: { q: Quadrant; row: string; col: string; action: string }[] = [
  { q: "INVESTIGATE", row: "Decision-sensitive", col: "Evidence weak", action: "Learn before deciding" },
  { q: "MONITOR", row: "Decision-sensitive", col: "Evidence adequate", action: "Set a signpost" },
  { q: "TOLERATE", row: "Not sensitive", col: "Evidence weak", action: "Leave it" },
  { q: "SETTLED", row: "Not sensitive", col: "Evidence adequate", action: "Nothing to do" },
];

function QuadrantMatrix({ a }: { a: DecisionAnalysis }) {
  const by = (q: Quadrant) => a.precision.filter((r) => r.quadrant === q);
  const box = (q: Quadrant, action: string) => {
    const rows = by(q);
    return (
      <div className={`min-h-28 p-3 ${q === "INVESTIGATE" && rows.length ? "bg-[var(--grade-contested)]/10" : ""}`}>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold">{action}</span>
          <span className="text-2xl tabular-nums">{rows.length}</span>
        </div>
        <ul className="mt-1 space-y-0.5 text-[12px] text-[var(--ink-muted)]">
          {rows.slice(0, 6).map((r) => (
            <li key={cellKey(r.cell.alternative_id, r.cell.objective_id)}>
              {r.cell.alternative_id} × {r.cell.objective_id}
              {r.max_evppi > 0 && <span className="tabular-nums"> · EVPPI {fmt(r.max_evppi)}</span>}
            </li>
          ))}
          {rows.length > 6 && <li>and {rows.length - 6} more</li>}
        </ul>
      </div>
    );
  };
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] text-sm">
      <div />
      <div className="px-3 pb-1 text-[12px] text-[var(--ink-muted)]">Evidence weak</div>
      <div className="px-3 pb-1 text-[12px] text-[var(--ink-muted)]">Evidence adequate</div>
      <div className="pr-3 pt-3 text-right text-[12px] text-[var(--ink-muted)]">Decision-sensitive</div>
      <div className="border-b border-r border-[var(--hairline)]">{box("INVESTIGATE", QUAD[0].action)}</div>
      <div className="border-b border-[var(--hairline)]">{box("MONITOR", QUAD[1].action)}</div>
      <div className="pr-3 pt-3 text-right text-[12px] text-[var(--ink-muted)]">Not sensitive</div>
      <div className="border-r border-[var(--hairline)]">{box("TOLERATE", QUAD[2].action)}</div>
      <div>{box("SETTLED", QUAD[3].action)}</div>
    </div>
  );
}

// --- step 8's table with traces ------------------------------------------------

function ConsequenceTable({ m, a }: { m: DecisionModel; a: DecisionAnalysis }) {
  const altLabel = (id: string) => m.alternatives.find((x) => x.id === id)?.label ?? id;
  const objLabel = (id: string) => m.objectives.find((x) => x.id === id)?.label ?? id;
  const [trace, setTrace] = useState<CellTrace | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const leaves = m.objectives.filter((o) => a.objectives.leaves.includes(o.id));
  const quad = new Map(a.precision.map((r) => [cellKey(r.cell.alternative_id, r.cell.objective_id), r.quadrant]));
  const open = async (alt: string, obj: string) => {
    setErr(null);
    try { setTrace(await decisionApi.trace(alt, obj)); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[var(--ink-muted)]">
              <th className="py-1.5 pr-4 text-left font-medium">Alternative</th>
              {leaves.map((o) => (
                <th key={o.id} className="py-1.5 pr-4 text-left font-medium">
                  {o.label}
                  <div className="font-normal">
                    {o.attribute ? `${o.attribute.unit}, ${o.attribute.direction === "MAXIMIZE" ? "higher" : "lower"} is better` : "no measure"}
                    {o.role === "CONSTRAINT" && ` · limit ${o.threshold}`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.alternatives.map((alt) => (
              <tr key={alt.id} className="border-b border-[var(--hairline)] last:border-0">
                <td className="py-1.5 pr-4">{alt.label}</td>
                {leaves.map((o) => {
                  const c = m.cells.find((x) => x.alternative_id === alt.id && x.objective_id === o.id);
                  const e = c?.estimate;
                  const q = quad.get(cellKey(alt.id, o.id));
                  return (
                    <td key={o.id} className="py-1 pr-2">
                      <button
                        onClick={() => open(alt.id, o.id)}
                        disabled={!c}
                        className={`w-full rounded px-2 py-1 text-left hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[var(--path-highlight)] disabled:cursor-default ${q === "INVESTIGATE" ? "ring-1 ring-[var(--grade-contested)]" : ""}`}
                        aria-label={`Trace ${alt.label}, ${o.label}`}
                      >
                        {e ? (
                          <>
                            <span className="tabular-nums">{e.p50}</span>
                            <span className="text-[11px] tabular-nums text-[var(--ink-muted)]"> [{e.p05}–{e.p95}]</span>
                            {q && <div className="text-[11px] text-[var(--ink-muted)]">{q.toLowerCase()}</div>}
                          </>
                        ) : (
                          <span className="text-[var(--grade-contradicted)]">missing</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-[var(--ink-muted)]">Median with the 5th–95th percentile range. Select a cell to trace it back to the quotes it rests on.</p>
      {err && <p className="text-sm text-[var(--grade-contradicted)]">{err}</p>}
      {trace && (
        <div className="space-y-3 border-l-2 border-[var(--path-highlight)] pl-3">
          <div className="text-sm font-semibold">
            Trace: {altLabel(trace.alternative_id)} × {objLabel(trace.objective_id)}
            <span className="font-normal text-[var(--ink-muted)]">
              {" "}· value {fmt(trace.value_p50 !== null ? trace.value_p50 * 100 : null)} of 100 · weakest evidence {trace.floor.grade ?? (trace.estimate?.method === "MEASURED" ? "measured" : trace.floor.untraced ? "untraced" : "edges not in graph")}
            </span>
          </div>
          {trace.edges.map((e) => (
            <div key={`${e.edge.source}->${e.edge.target}`} className="text-[13px]">
              <div>
                <span className="font-medium">{e.edge.source} → {e.edge.target}</span>
                <span className="text-[var(--ink-muted)]"> · {e.evidence_grade ?? "not in graph"} · {e.citation_count} citation(s) · basis {e.basis.join(", ") || "no card"} · transport {e.transport ?? "—"}</span>
              </div>
              {e.mechanism_text && <div className="text-[var(--ink-muted)]">{e.mechanism_text}</div>}
              {e.statements.map((s) => (
                <blockquote key={s.id} className="mt-1 border-l border-[var(--hairline)] pl-2 italic">“{s.quote}” <span className="not-italic text-[var(--ink-muted)]">({s.group_id})</span></blockquote>
              ))}
            </div>
          ))}
          {!trace.edges.length && <p className="text-[13px] text-[var(--ink-muted)]">No basis edges recorded for this cell.</p>}
        </div>
      )}
    </>
  );
}

// --- step 9's pooling, explicit ------------------------------------------------

function Pooling() {
  const [p, setP] = useState<PooledRanking | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        onClick={async () => { setErr(null); try { setP(await decisionApi.pooled()); } catch (e) { setErr((e as Error).message); } }}
        className="rounded border border-[var(--hairline)] px-3 py-1 text-sm hover:bg-black/5"
      >
        Compute a pooled ranking (equal shares)
      </button>
      <p className="text-[12px] text-[var(--ink-muted)]">Pooling combines groups' weights into one ranking. It is never shown by default because it settles a value disagreement by arithmetic.</p>
      {err && <p className="text-sm text-[var(--grade-contradicted)]">{err}</p>}
      {p && (
        <div className="text-[13px]">
          <div className="font-medium">{p.label} · {p.rule}</div>
          <ol className="list-decimal pl-5">
            {p.ranked.map((r) => <li key={r.alternative_id}>{r.alternative_id} <span className="tabular-nums text-[var(--ink-muted)]">{fmt(r.value)}</span></li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

// --- per-step content ---------------------------------------------------------------

export function StepContent({ n, m, a }: { n: number; m: DecisionModel; a: DecisionAnalysis }) {
  const groupOf = new Map(m.interviews.map((i) => [i.id, i.group_id]));
  const label = (aid: string) => m.alternatives.find((x) => x.id === aid)?.label ?? aid;
  switch (n) {
    case 1:
      return (
        <>
          <Section title="Frame">
            <Table head={["Field", "Value"]} rows={[
              ["Decision", m.frame.decision_statement],
              ["Owner", m.frame.owner],
              ["Decide now", m.frame.focus.join(", ") || "—"],
              ["Already settled", m.frame.givens.join("; ") || "—"],
              ["Decide later", m.frame.deferred.join("; ") || "—"],
              ["Serves", m.frame.beneficiary ?? "—"],
              ["Affected, not interviewed", m.frame.affected_not_involved.join("; ") || "—"],
              ["Horizon", m.frame.horizon ?? "—"],
            ]} />
          </Section>
          <Section title="Questions">
            <Table head={["Question", "Type", "Confirmed", "Source"]} rows={m.frame.questions.map((q) => [q.text, q.kind ?? "untyped", yes(q.confirmed), q.suggested_by.toLowerCase()])} empty="No questions recorded." />
          </Section>
        </>
      );
    case 2:
      return (
        <Section title="Groups and interviews">
          <Table head={["Group", "Interviews", "Statements"]} rows={m.groups.map((g) => {
            const ivs = m.interviews.filter((i) => i.group_id === g.id);
            const n = m.statements.filter((s) => groupOf.get(s.interview_id) === g.id).length;
            return [g.label, ivs.map((i) => `${i.mode.toLowerCase()}${i.redaction_confirmed ? "" : " (unredacted)"}`).join(", ") || "none", n];
          })} empty="No user groups yet." />
        </Section>
      );
    case 3:
      return (
        <>
          <Section title="Facts, values, options">
            <Table head={["Kind", "Statements"]} rows={[
              ["Values (objectives, means, constraints)", a.partition.values.length],
              ["Facts (causal beliefs, claims, uncertainties)", a.partition.facts.length],
              ["Options", a.partition.options.length],
              ["Out of frame", a.partition.out_of_frame.length],
              ["Not linked to anything", a.partition.unlinked.length],
            ]} />
          </Section>
          <Section title="Statements">
            <Table head={["Group", "Type", "Quote", "Linked to"]} rows={m.statements.map((s) => [
              groupOf.get(s.interview_id) ?? "?",
              s.type.toLowerCase().replace(/_/g, " ") + (s.coded_by === "MACHINE" && !s.verified ? " (unverified)" : ""),
              <span className="italic">“{s.quote}”</span>,
              s.objective_id ?? s.alternative_id ?? (s.edge ? `${s.edge.source} → ${s.edge.target}` : s.node_id) ?? "—",
            ])} />
          </Section>
        </>
      );
    case 4:
      return (
        <>
          <Section title="Objectives">
            <Table head={["Objective", "Kind", "Measure", "Range", "Orders of worth", "Raised by"]} rows={m.objectives.map((o) => [
              o.label,
              o.kind === "MEANS" ? `means → ${o.serves.join(", ")}` : o.role === "CONSTRAINT" ? `constraint (limit ${o.threshold})` : o.parent_id ? `fundamental, under ${o.parent_id}` : "fundamental",
              o.attribute ? `${o.attribute.name} (${o.attribute.unit}, ${o.attribute.kind.toLowerCase()})` : "—",
              o.attribute ? `${o.attribute.worst} worst → ${o.attribute.best} best` : "—",
              o.registers.map((r) => r.toLowerCase()).join(", ") || "—",
              (a.objectives.raised_by[o.id] ?? []).join(", ") || "—",
            ])} empty="No objectives yet." />
          </Section>
          {a.objectives.register_gaps.length > 0 && (
            <Section title="Orders of worth no objective expresses">
              <Table head={["Order of worth", "Invoked on"]} rows={a.objectives.register_gaps.map((g) => [g.register.toLowerCase(), g.consequence_ids.join(", ")])} />
            </Section>
          )}
        </>
      );
    case 5:
      return (
        <Section title="Strategy table">
          <Table
            head={["Alternative", "Kind", ...a.strategy_table.dimensions.map((d) => d.label)]}
            rows={a.strategy_table.rows.map((r) => [r.label, r.kind.toLowerCase().replace("_", " "), ...a.strategy_table.dimensions.map((d) => r.choices[d.node_id] ?? "—")])}
            empty="No alternatives yet."
          />
        </Section>
      );
    case 6: {
      const idg = a.influence_diagram;
      return (
        <>
          <Section title="Influence diagram">
            <Table head={["Role", "Nodes"]} rows={[
              ["Decisions", idg.decision_nodes.join(", ") || "—"],
              ["Uncertain consequences reached", idg.chance_nodes.join(", ") || "—"],
              ["Objectives (value nodes)", idg.value_nodes.join(", ") || "—"],
              ["On a path from a decision to an objective", idg.relevant_nodes.join(", ") || "—"],
            ]} />
          </Section>
          <Section title="Feedback loops in the decision-relevant subgraph">
            <Table head={["Loop", "Treatment"]} rows={idg.cycles.map((c) => [c.nodes.join(" → "), c.treatment?.toLowerCase().replace(/_/g, " ") ?? "untreated"])} empty="None." />
          </Section>
        </>
      );
    }
    case 7:
      return (
        <>
          <Section title="Edge evidence cards">
            <Table head={["Edge", "Basis", "Form", "Transport", "Confounders", "Differs by group"]} rows={m.edge_cards.map((c) => [
              `${c.edge.source} → ${c.edge.target}`,
              c.basis.map((b) => b.toLowerCase().replace("_", " ")).join(", "),
              c.causal_form.toLowerCase(),
              c.transport.toLowerCase().replace("_", " "),
              c.confounders.map((x) => `${x.name} (${x.status.toLowerCase()})`).join(", ") || (c.confounder_prompt_answered ? "none named" : "not asked"),
              c.group_effects.map((g) => `${g.group_id} ${g.direction > 0 ? "+" : g.direction < 0 ? "−" : "0"}`).join(", ") || "—",
            ])} empty="No cards yet." />
          </Section>
          <Section title="Adjustment sets for estimating each basis edge from observational data">
            <Table head={["Edge", "Adjust for", "Note"]} rows={a.backdoor.map((b) => [
              `${b.edge.source} → ${b.edge.target}`,
              !b.computable ? "not computable" : b.adjustment_set === null ? "none suffices" : b.adjustment_set.join(", ") || "nothing",
              b.note,
            ])} />
          </Section>
        </>
      );
    case 8:
      return <Section title="Consequence table"><ConsequenceTable m={m} a={a} /></Section>;
    case 9:
      return (
        <>
          <Section title="Rankings by group">
            {a.rankings.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {a.rankings.map((r) => (
                  <div key={r.group_id} className="text-[13px]">
                    <div className="font-medium">{m.groups.find((g) => g.id === r.group_id)?.label ?? r.group_id}</div>
                    <ol className="list-decimal pl-5">
                      {r.ranked.map((x) => (
                        <li key={x.alternative_id}>
                          {label(x.alternative_id)} <span className="tabular-nums text-[var(--ink-muted)]">{fmt(x.value)}</span>
                          {x.at_risk && <span className="text-[var(--grade-contested)]"> · constraint at risk</span>}
                        </li>
                      ))}
                    </ol>
                    {!r.preferential_independence_checked && <div className="text-[12px] text-[var(--ink-muted)]">Independence of preferences not checked.</div>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-[var(--ink-muted)]">Rankings need a complete consequence table and each group's swing weights.</p>}
          </Section>
          <Section title="Constraints">
            <Table head={["Alternative", "Status", "Checks"]} rows={a.screen.filter((s) => s.checks.length).map((s) => [label(s.alternative_id), s.status.toLowerCase().replace("_", " "), s.checks.map((c) => `${c.objective_id} ${c.status.toLowerCase()}`).join(", ")])} empty="No constraint objectives." />
          </Section>
          <Section title="Dominated alternatives">
            <Table head={["Dominated", "By", "Holds across the ranges?"]} rows={a.dominance.map((d) => [label(d.dominated), label(d.by), d.kind === "ROBUST" ? "yes" : "medians only"])} empty="None." />
          </Section>
          {a.even_swaps.length > 0 && (
            <Section title="Even swaps vs swing weights">
              <Table head={["Group", "Swap", "Implied ratio", "Elicited ratio", "Consistent"]} rows={a.even_swaps.flatMap((t) => t.checks.map((c) => [t.group_id, c.swap_id, fmt(c.implied_ratio, 2), fmt(c.elicited_ratio, 2), yes(c.consistent)]))} />
            </Section>
          )}
          <Section title="Pooling"><Pooling /></Section>
        </>
      );
    case 10:
      return (
        <>
          <Section title="Evidence demanded vs decision sensitivity"><QuadrantMatrix a={a} /></Section>
          <Section title="Cells">
            <Table head={["Cell", "Sensitive for", "EVPPI", "Weakest evidence", "Flags"]} rows={a.precision.map((r) => [
              `${label(r.cell.alternative_id)} × ${r.cell.objective_id}`,
              r.sensitive_groups.join(", ") || "—",
              <span className="tabular-nums">{fmt(r.max_evppi)}</span>,
              r.floor_grade ?? (r.flags.includes("measured, not predicted") ? "measured" : r.flags.some((f) => f.startsWith("basis edges not in graph")) ? "edges not in graph" : "untraced"),
              r.flags.filter((f) => f !== "measured, not predicted").join("; ") || "—",
            ])} empty="Needs rankings first." />
            <p className="text-[12px] text-[var(--ink-muted)]">EVPPI: expected value of partial perfect information, in value points on the 0–100 scale. It is what knowing the cell exactly would be worth to the group's choice.</p>
          </Section>
          <Section title="Perfect information on everything">
            <Table head={["Group", "EVPI", "Best choice on current information"]} rows={a.voi.map((v) => [v.group_id, <span className="tabular-nums">{fmt(v.evpi)}</span>, label(v.top_under_expectation)])} />
          </Section>
          <Section title="Weights near a rank reversal">
            <Table head={["Group", "Objective", "Weight", "Stable between", "Takeover"]} rows={a.weight_stability.filter((w) => w.sensitive).map((w) => [w.group_id, w.objective_id, fmt(w.current, 2), `${fmt(w.lo, 2)}–${fmt(w.hi, 2)}`, w.takeover_at_lo ?? w.takeover_at_hi ?? "—"])} empty="No weight sits near a reversal." />
          </Section>
        </>
      );
    case 11:
      return (
        <>
          <Section title="Assumptions">
            <Table head={["Assumption", "Load-bearing", "Vulnerable", "Signposts", "Actions", "Gaps"]} rows={m.assumptions.map((x) => {
              const st = a.assumptions.find((s) => s.assumption_id === x.id);
              return [x.text, st?.load_bearing ? "yes" : "no", yes(x.vulnerable), x.signposts.map((s) => `${s.indicator} (${s.threshold})`).join("; ") || "—", [...x.shaping_actions, ...x.hedging_actions].join("; ") || "—", st?.gaps.join("; ") || "—"];
            })} empty="No assumptions recorded." />
          </Section>
          <Section title="Candidates the analysis suggests writing">
            <Table head={["Cell", "Why", "Draft"]} rows={a.assumption_candidates.map((c) => [`${label(c.cell.alternative_id)} × ${c.cell.objective_id}`, c.why.join(", "), c.text])} empty="None." />
          </Section>
        </>
      );
    case 12: {
      const r = m.record;
      return (
        <>
          <Section title="Decision quality">
            <div className="space-y-3">
              {a.decision_quality.map((e) => (
                <div key={e.element} className="text-[13px]">
                  <div className="font-medium">{e.element} <span className="font-normal text-[var(--ink-muted)]">{e.ok ? "· all checks pass" : ""}</span></div>
                  <ul>
                    {e.checks.map((c) => (
                      <li key={c.check} className={c.ok ? "text-[var(--ink-muted)]" : ""}>
                        <span aria-hidden>{c.ok ? "✓" : "○"}</span> {c.check}{c.detail ? `: ${c.detail}` : ""}
                        <span className="sr-only">{c.ok ? " (passes)" : " (gap)"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-[12px] text-[var(--ink-muted)]">These check that each element is present and consistent. They do not judge whether it is good.</p>
            </div>
          </Section>
          <Section title="Record">
            {r ? (
              <Table head={["Field", "Value"]} rows={[
                ["Chosen", label(r.chosen_alternative_id)],
                ["Decided by", `${r.decided_by}${r.decided_on ? `, ${r.decided_on}` : ""}`],
                ["Rationale", r.rationale],
                ["Positions", r.positions.map((p) => `${p.group_id}: ${p.preferred_alternative_id ? label(p.preferred_alternative_id) : "—"}${p.dissent_note ? ` (${p.dissent_note})` : ""}`).join("; ") || "—"],
                ["Premortem", r.premortem.map((p) => p.failure_story).join("; ") || "—"],
                ["Analysis it was made on", r.analysis_hash === a.analysis_hash ? "current" : "out of date: the model changed after recording"],
              ]} />
            ) : <p className="text-sm text-[var(--ink-muted)]">Not recorded. Record through POST /api/decision/record once the checks above pass.</p>}
          </Section>
        </>
      );
    }
    default:
      return null;
  }
}
