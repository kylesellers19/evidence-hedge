const valence = [
  ["var(--valence-neg2)", "−2"],
  ["var(--valence-neg1)", "−1"],
  ["var(--valence-0)", "0"],
  ["var(--valence-pos1)", "+1"],
  ["var(--valence-pos2)", "+2"],
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
      <div className="flex items-center gap-1">
        <span className="text-[var(--ink-muted)]">valence</span>
        {valence.map(([c, l]) => (
          <span key={l} className="flex h-4 w-6 items-center justify-center rounded-sm text-[9px] text-white" style={{ background: c }}>
            {l}
          </span>
        ))}
      </div>
      <div className="space-y-1">
        <Line dash={undefined} color="var(--grade-ink)" text="supported (solid)" />
        <Line dash="6 4" color="var(--grade-ink)" text="weak / analogical (dashed)" />
        <Line dash="6 4" color="var(--grade-contested)" text="contested" />
        <Line dash="6 3" color="var(--grade-contradicted)" text="contradicted" />
        <Line dash="8 4" color="var(--closure)" text="closure → seed" />
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--divergence)" }} />
        ⚡ divergence · R⟳ reinforcing · B⟲ balancing
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
