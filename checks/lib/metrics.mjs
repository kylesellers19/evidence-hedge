// ─────────────────────────────────────────────────────────────────────────────
// Benchmark metrics: confusion matrices, per-class precision and recall,
// binary detection, Spearman rank correlation (average ranks for ties).
// ─────────────────────────────────────────────────────────────────────────────

const r3 = (x) => (Number.isFinite(x) ? +x.toFixed(3) : null)

/** @param {{gold:string, pred:string}[]} pairs */
export function multiclass(pairs, classes) {
  const confusion = Object.fromEntries(classes.map((g) => [g, Object.fromEntries(classes.map((p) => [p, 0]))]))
  for (const { gold, pred } of pairs) confusion[gold][pred]++
  const perClass = {}
  for (const c of classes) {
    const tp = confusion[c][c]
    const fp = classes.reduce((s, g) => s + (g === c ? 0 : confusion[g][c]), 0)
    const fn = classes.reduce((s, p) => s + (p === c ? 0 : confusion[c][p]), 0)
    const precision = tp + fp ? tp / (tp + fp) : 0
    const recall = tp + fn ? tp / (tp + fn) : 0
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
    perClass[c] = { n: tp + fn, precision: r3(precision), recall: r3(recall), f1: r3(f1) }
  }
  const n = pairs.length
  const accuracy = n ? classes.reduce((s, c) => s + confusion[c][c], 0) / n : NaN
  const macroF1 = classes.reduce((s, c) => s + perClass[c].f1, 0) / classes.length
  return { n, accuracy: r3(accuracy), macroF1: r3(macroF1), perClass, confusion }
}

/** @param {{gold:boolean, pred:boolean}[]} pairs */
export function binary(pairs) {
  let tp = 0, fp = 0, fn = 0, tn = 0
  for (const { gold, pred } of pairs) {
    if (gold && pred) tp++
    else if (!gold && pred) fp++
    else if (gold && !pred) fn++
    else tn++
  }
  const precision = tp + fp ? tp / (tp + fp) : 0
  const recall = tp + fn ? tp / (tp + fn) : 0
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
  return { n: pairs.length, precision: r3(precision), recall: r3(recall), f1: r3(f1), tp, fp, fn, tn }
}

function ranks(xs) {
  const order = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0])
  const out = new Array(xs.length)
  for (let i = 0; i < order.length;) {
    let j = i
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) out[order[k][1]] = avg
    i = j + 1
  }
  return out
}

/** Spearman's rho: Pearson correlation of average ranks. */
export function spearman(xs, ys) {
  const rx = ranks(xs), ry = ranks(ys)
  const n = xs.length
  const mx = rx.reduce((a, b) => a + b, 0) / n
  const my = ry.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (rx[i] - mx) * (ry[i] - my)
    sxx += (rx[i] - mx) ** 2
    syy += (ry[i] - my) ** 2
  }
  return r3(sxy / Math.sqrt(sxx * syy))
}

/** Seeded PRNG (mulberry32), the same generator scripts/eval-causal-register.mjs uses. */
export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
