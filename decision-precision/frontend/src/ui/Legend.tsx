import type { Register } from "../api";
import { REGISTER_LABEL, registerVar } from "../graph/semantics";

const REGISTERS: Register[] = [
  "MARKET", "INDUSTRIAL", "CIVIC", "DOMESTIC", "INSPIRED", "FAME", "GREEN", "PROJECTIVE",
];

export function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 space-y-2 rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)]/90 p-3 text-[11px] backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-4 rounded-sm border-2" style={{ borderColor: "var(--node-border)" }} />
        decision
        <span className="ml-2 inline-block h-3 w-3 rounded-full border-2" style={{ borderColor: "var(--node-border)" }} />
        consequence
      </div>
      <div>
        <div className="mb-0.5 text-[var(--ink-muted)]">registers (opacity = confidence)</div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-0.5">
          {REGISTERS.map((r) => (
            <div key={r} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: registerVar(r) }} />
              <span>{REGISTER_LABEL[r]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Line dash={undefined} color="var(--grade-ink)" text="supported (solid)" />
        <Line dash="6 4" color="var(--grade-ink)" text="weak / analogical (dashed)" />
        <Line dash="6 4" color="var(--grade-contested)" text="contested" />
        <Line dash="8 4" color="var(--closure)" text="closure → seed" />
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ outline: "2px solid var(--register-clash)", outlineOffset: "1px" }} />
        ◈ register clash
        <span className="ml-1" style={{ color: "var(--tradition-tension)" }}>⚔ tradition tension</span>
      </div>
      <div className="flex items-center gap-2 text-[var(--ink-muted)]">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--coding-pending)" }} />
        ⋯ coding pending · R⟳ reinforcing · B⟲ balancing
      </div>
    </div>
  );
}

function Line({ dash, color, text }: { dash: string | undefined; color: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="6">
        <line x1="0" y1="3" x2="28" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dash} />
      </svg>
      <span>{text}</span>
    </div>
  );
}
