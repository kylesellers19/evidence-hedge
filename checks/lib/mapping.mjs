// ─────────────────────────────────────────────────────────────────────────────
// Benchmark mappings: engine measurements onto published label scales
// (change set 1). Every table here is a ratification item.
//
// Yu, Li & Wang (2019) number their classes 0 none, 1 direct causal,
// 2 conditional causal, 3 correlational (upstream junwang4/
// causal-language-use-in-science CSV; scripts/eval-causal-register.mjs). The
// codes are not ordinal, so classes are matched by name, and causal strength
// is the ordinal rank of the class.
// ─────────────────────────────────────────────────────────────────────────────

// Engine register → ordinal causal strength 0–3. PROVISIONAL — not ratified.
export const REGISTER_STRENGTH = { none: 0, correlational: 1, 'conditional-causal': 2, 'direct-causal': 3 }
export const STRENGTH_REGISTER = Object.fromEntries(Object.entries(REGISTER_STRENGTH).map(([k, v]) => [v, k]))

// Yu's upstream code → class. PROVISIONAL — not ratified.
export const YU_UPSTREAM_CLASS = { 0: 'none', 1: 'direct-causal', 2: 'conditional-causal', 3: 'correlational' }

// Assertiveness tier → rank, for rank correlation with Pei & Jurgens'
// 1–6 certainty. PROVISIONAL — not ratified.
export const TIER_RANK = { hedged: 1, measured: 2, assertive: 3, absolute: 4 }

// Causal-sentence detection: the engine says "causal" when the register has
// causal force. The wide reading adds correlational. PROVISIONAL — not ratified.
export const CAUSAL_POSITIVE = new Set(['conditional-causal', 'direct-causal'])
export const CAUSAL_POSITIVE_WIDE = new Set(['correlational', 'conditional-causal', 'direct-causal'])

// Restatement vs. source: compare the two sides' causal strength.
// PROVISIONAL — not ratified.
export const PAIR_LABELS = ['same', 'exaggerates', 'downplays']
export function pairLabel(restatement, source) {
  if (restatement == null || source == null) return { label: 'undetermined', reason: 'a side has no strength' }
  if (restatement === source) return { label: 'same' }
  return { label: restatement > source ? 'exaggerates' : 'downplays' }
}
