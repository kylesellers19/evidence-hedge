#!/usr/bin/env python3
"""Independent reference for the compare-firms statistics.

Run from the repository root:

    uv run --with scipy --with statsmodels --with numpy python scripts/compare-reference.py

Reads  checks/targets/compare/reference-inputs.json
Writes checks/targets/compare-stats.json

Written from the method's definitions and textbook formulas, without reading the
JavaScript it checks (src/list/compare/). scipy supplies the Mann-Whitney U, the
Theil-Sen slope and Kendall's tau (used to cross-check our own statistics);
statsmodels supplies Holm. The Hodges-Lehmann shift, its stratified form, the van
Elteren statistic, the Mantel-Haenszel rate ratio and rate difference, and every
permutation and bootstrap loop are written here.

Randomness: numpy's default generator (PCG64), one stream per row and purpose,
seeded with SeedSequence([SEED, crc32(slug), crc32(row id), purpose]), so a row's
draws do not depend on the order rows are computed in. Percentiles use numpy's
default (linear) np.quantile.
"""
from __future__ import annotations

import datetime as dt
import itertools
import json
import math
import platform
import sys
import time
import zlib
from functools import reduce
from pathlib import Path

import numpy as np
import scipy
import statsmodels
from scipy import stats
from statsmodels.stats.multitest import multipletests

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "checks" / "targets" / "compare" / "reference-inputs.json"
OUTPUT = ROOT / "checks" / "targets" / "compare-stats.json"

SEED = 20261127
PURPOSE_PERMUTATION = 1
PURPOSE_BOOTSTRAP = 2

DEFAULTS = {
    "MIN_REPORTS": 5,
    "TREND_MIN_REPORTS": 6,
    "TREND_MIN_YEARS": 3,
    "BOOTSTRAP_DRAWS": 4000,
    "PERMUTATION_DRAWS": 10000,
    "CONFIDENCE": 0.95,
}
EXACT_LIMIT = 10000  # enumerate every arrangement when there are at most this many
BATCHES = 20  # batch means for the bootstrap quantiles' Monte Carlo error
CHUNK = 200  # rows of permutations / bootstrap draws handled at once
CELLS = 8_000_000  # cap on chunk rows x pairs in the Theil-Sen loops

GRID = 91  # scores 1.0 .. 10.0 on a 0.1 grid -> 0 .. 90 tenths above 1.0

FLOAT_TOL = 1e-9


# ---------------------------------------------------------------- utilities


def rng_for(slug: str, row: str, purpose: int) -> np.random.Generator:
    seq = np.random.SeedSequence(
        [SEED, zlib.crc32(slug.encode()), zlib.crc32(row.encode()), purpose]
    )
    return np.random.default_rng(seq)


def at_least(stat: np.ndarray, observed: float) -> np.ndarray:
    """|T*| >= |T_obs| with a relative tolerance, as the method states it."""
    tol = FLOAT_TOL * max(1.0, abs(observed))
    return stat >= abs(observed) - tol


def quantile(values, q: float):
    """np.quantile (linear), dropping NaN (undefined draws), keeping infinities."""
    v = np.asarray(values, dtype=float)
    v = v[~np.isnan(v)]
    if v.size == 0:
        return None
    if np.all(np.isfinite(v)):
        return float(np.quantile(v, q))
    v = np.sort(v)
    h = (v.size - 1) * q
    lo = int(math.floor(h))
    hi = min(lo + 1, v.size - 1)
    frac = h - lo
    a, b = float(v[lo]), float(v[hi])
    if frac == 0 or a == b:
        return a
    if math.isinf(a) and math.isinf(b):
        return float("nan")
    if math.isinf(a):
        return a
    if math.isinf(b):
        return b
    return float(np.quantile(np.array([a, b]), frac))


def interval(draws: np.ndarray, conf: float):
    """Percentile interval, batch-means standard errors, and usable draw count."""
    q_lo, q_hi = (1 - conf) / 2, 1 - (1 - conf) / 2
    d = np.asarray(draws, dtype=float)
    lo, hi = quantile(d, q_lo), quantile(d, q_hi)
    batches = d.reshape(BATCHES, -1)
    ses = []
    for q in (q_lo, q_hi):
        bq = [quantile(b, q) for b in batches]
        if any(x is None or not math.isfinite(x) for x in bq):
            ses.append(None)
        else:
            ses.append(float(np.std(np.array(bq), ddof=1) / math.sqrt(BATCHES)))
    used = int((~np.isnan(d)).sum())
    return lo, hi, ses[0], ses[1], used


def sample_subsets(rng: np.random.Generator, k: int, n_total: int, n_pick: int):
    """k uniformly random subsets of size n_pick from range(n_total), as index rows."""
    keys = rng.random((k, n_total))
    return np.argsort(keys, axis=1)[:, :n_pick]


def all_subsets(n_total: int, n_pick: int) -> np.ndarray:
    return np.array(list(itertools.combinations(range(n_total), n_pick)), dtype=np.int64).reshape(
        -1, n_pick
    )


def sum_over_strata(per_stratum: list[np.ndarray]) -> np.ndarray:
    """Every combination of one arrangement per stratum, summed (exact enumeration)."""
    return reduce(np.add.outer, per_stratum).ravel()


def counts_per_row(idx: np.ndarray, size: int) -> np.ndarray:
    """Row-wise bincount: idx (k, n) values in [0, size) -> (k, size) counts."""
    k = idx.shape[0]
    flat = (np.arange(k)[:, None] * size + idx).ravel()
    return np.bincount(flat, minlength=k * size).reshape(k, size)


def empty_row(n):
    return {
        "estimate": None,
        "p": None,
        "pAdj": None,
        "exact": None,
        "draws": None,
        "lo": None,
        "hi": None,
        "se_p": None,
        "se_lo": None,
        "se_hi": None,
        "n": n,
        "rateA": None,
        "rateB": None,
        "diff": None,
        "reportDiff": None,
        "zero": None,
    }


# ---------------------------------------------------------------- scores


def tenths(scores: np.ndarray) -> np.ndarray:
    t = np.rint(np.asarray(scores, dtype=float) * 10).astype(np.int64) - 10
    assert np.all((t >= 0) & (t < GRID)), "score off the 1..10 grid"
    assert np.allclose((t + 10) / 10, scores, atol=1e-9), "score off the 0.1 grid"
    return t


def hl_from_counts(ca: np.ndarray, cb: np.ndarray) -> float:
    """Hodges-Lehmann shift (points) from the two firms' score histograms.

    The pairwise differences a - b, in tenths, have the distribution
    D = ca * reverse(cb) (a convolution); index k is a difference of k - 90 tenths.
    The median is the middle value (odd count) or the mean of the two middle values.
    """
    D = np.convolve(ca, cb[::-1])
    M = int(D.sum())
    cum = np.cumsum(D)
    p1 = int(np.searchsorted(cum, (M - 1) // 2, side="right"))
    p2 = int(np.searchsorted(cum, M // 2, side="right"))
    return (p1 + p2 - 2 * (GRID - 1)) / 20.0


def score_row(slug, rid, strata, C):
    """strata: list of (a_scores, b_scores) float arrays, each with >= 1 report."""
    nA = sum(len(a) for a, _ in strata)
    nB = sum(len(b) for _, b in strata)
    row = empty_row([nA, nB])
    if not strata:
        return row

    # estimate: (stratified) Hodges-Lehmann
    tA = [tenths(a) for a, _ in strata]
    tB = [tenths(b) for _, b in strata]
    w = np.array([len(a) * len(b) / (len(a) + len(b)) for a, b in strata])
    w = w / w.sum()  # normalised first, so one stratum gives the plain HL exactly
    hls = []
    for (a, b), ta, tb in zip(strata, tA, tB):
        hl = hl_from_counts(np.bincount(ta, minlength=GRID), np.bincount(tb, minlength=GRID))
        brute = float(np.median(np.subtract.outer(a, b)))
        assert abs(hl - brute) < 1e-9, (rid, hl, brute)
        hls.append(hl)
    hls = np.array(hls)
    row["estimate"] = float((w * hls).sum())

    if nA < C["MIN_REPORTS"] or nB < C["MIN_REPORTS"]:
        return row

    # van Elteren statistic (Mann-Whitney centred and scaled, summed over strata)
    ranks, sizes = [], []
    T_obs = 0.0
    for a, b in strata:
        r = stats.rankdata(np.concatenate([a, b]))  # midranks
        na, N = len(a), len(a) + len(b)
        R = r[:na].sum()
        T_obs += (R - na * (N + 1) / 2) / (N + 1)
        ranks.append(r)
        sizes.append((na, N))
    if len(strata) == 1:
        a, b = strata[0]
        U = stats.mannwhitneyu(a, b, alternative="two-sided").statistic
        na, nb = len(a), len(b)
        T_mw = (U - na * nb / 2) / (na + nb + 1)
        assert abs(T_mw - T_obs) < 1e-9, (rid, T_mw, T_obs)
    row["stat"] = abs(T_obs)

    total = math.prod(math.comb(N, na) for na, N in sizes)
    if total <= EXACT_LIMIT:
        per = []
        for r, (na, N) in zip(ranks, sizes):
            idx = all_subsets(N, na)
            per.append((r[idx].sum(axis=1) - na * (N + 1) / 2) / (N + 1))
        Tall = sum_over_strata(per)
        assert Tall.size == total
        row["p"] = float(at_least(np.abs(Tall), T_obs).mean())
        row["exact"], row["draws"], row["se_p"] = True, int(total), 0.0
    else:
        m = C["PERMUTATION_DRAWS"]
        rng = rng_for(slug, rid, PURPOSE_PERMUTATION)
        Tm = np.zeros(m)
        for r, (na, N) in zip(ranks, sizes):
            idx = sample_subsets(rng, m, N, na)
            Tm += (r[idx].sum(axis=1) - na * (N + 1) / 2) / (N + 1)
        b = int(at_least(np.abs(Tm), T_obs).sum())
        p = (b + 1) / (m + 1)
        row["p"], row["exact"], row["draws"] = p, False, m
        row["se_p"] = math.sqrt(p * (1 - p) / m)

    # percentile bootstrap of the (stratified) HL, cell sizes kept
    B = C["BOOTSTRAP_DRAWS"]
    rng = rng_for(slug, rid, PURPOSE_BOOTSTRAP)
    acc = np.zeros(B)
    for ws, ta, tb in zip(w, tA, tB):
        ca = counts_per_row(ta[rng.integers(0, len(ta), size=(B, len(ta)))], GRID)
        cb = counts_per_row(tb[rng.integers(0, len(tb), size=(B, len(tb)))], GRID)
        acc += ws * np.array([hl_from_counts(ca[d], cb[d]) for d in range(B)])
    draws = acc
    lo, hi, se_lo, se_hi, used = interval(draws, C["CONFIDENCE"])
    row.update(lo=lo, hi=hi, se_lo=se_lo, se_hi=se_hi, bootDraws=used)
    return row


# ---------------------------------------------------------------- flags


def mh_parts(a, T1, b, T0):
    """Per-stratum Mantel-Haenszel pieces; all arguments broadcast together."""
    T = T1 + T0
    num = a * T0 / T  # rate-ratio numerator
    den = b * T1 / T  # rate-ratio denominator
    w = T1 * T0 / T  # rate-difference weight
    wd = w * (a / T1 - b / T0)  # weighted rate difference
    return num, den, w, wd


def log_rr(num, den):
    """log(num / den): 0/0 -> 0, 0/x -> -inf, x/0 -> +inf."""
    num = np.asarray(num, dtype=float)
    den = np.asarray(den, dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        out = np.log(num / den)
    out = np.where((num == 0) & (den == 0), 0.0, out)
    return out


def flag_signed(num, den, w, wd, zero: bool):
    if zero:
        return 100 * wd / w
    return log_rr(num, den)


def flag_row(slug, rid, strata, C):
    """strata: list of (kA, cA, kB, cB) int arrays (flag counts, claims), each >= 1 report."""
    nA = sum(len(s[0]) for s in strata)
    nB = sum(len(s[2]) for s in strata)
    row = empty_row([nA, nB])
    if not strata:
        return row

    a = np.array([s[0].sum() for s in strata], dtype=float)
    T1 = np.array([s[1].sum() for s in strata], dtype=float)
    b = np.array([s[2].sum() for s in strata], dtype=float)
    T0 = np.array([s[3].sum() for s in strata], dtype=float)
    num, den, w, wd = (x.sum() for x in mh_parts(a, T1, b, T0))
    with np.errstate(divide="ignore", invalid="ignore"):
        rr = num / den
    rd = 100 * wd / w
    zero = bool(a.sum() == 0 or b.sum() == 0)

    v = np.array([len(s[0]) * len(s[2]) / (len(s[0]) + len(s[2])) for s in strata])
    mean_a = np.array([np.mean(100 * s[0] / s[1]) for s in strata])
    mean_b = np.array([np.mean(100 * s[2] / s[3]) for s in strata])

    row.update(
        rateA=float(100 * a.sum() / T1.sum()),
        rateB=float(100 * b.sum() / T0.sum()),
        diff=float(rd),
        reportDiff=float((v * (mean_a - mean_b)).sum() / v.sum()),
        zero=zero,
        rr=float(rr) if not math.isnan(rr) else None,
    )
    row["estimate"] = float(rd) if zero else float(log_rr(num, den))

    if nA < C["MIN_REPORTS"] or nB < C["MIN_REPORTS"]:
        return row
    if a.sum() == 0 and b.sum() == 0:
        # no flags of this kind on either side: nothing to test
        row.update(p=1.0, lo=0.0, hi=0.0, se_p=0.0, se_lo=0.0, se_hi=0.0, note="both-zero")
        return row

    obs = abs(row["estimate"])
    row["stat"] = obs

    pooled = [
        (np.concatenate([s[0], s[2]]).astype(float), np.concatenate([s[1], s[3]]).astype(float), len(s[0]))
        for s in strata
    ]
    total = math.prod(math.comb(len(k), na) for k, _, na in pooled)

    def parts_for(idx, k, c):
        ka, ca = k[idx].sum(axis=1), c[idx].sum(axis=1)
        return mh_parts(ka, ca, k.sum() - ka, c.sum() - ca)

    if total <= EXACT_LIMIT:
        acc = [[], [], [], []]
        for k, c, na in pooled:
            for slot, part in zip(acc, parts_for(all_subsets(len(k), na), k, c)):
                slot.append(part)
        sums = [sum_over_strata(slot) for slot in acc]
        stat = np.abs(flag_signed(*sums, zero))
        assert stat.size == total
        row["p"] = float(at_least(stat, obs).mean())
        row["exact"], row["draws"], row["se_p"] = True, int(total), 0.0
    else:
        m = C["PERMUTATION_DRAWS"]
        rng = rng_for(slug, rid, PURPOSE_PERMUTATION)
        sums = [np.zeros(m) for _ in range(4)]
        for k, c, na in pooled:
            for slot, part in zip(sums, parts_for(sample_subsets(rng, m, len(k), na), k, c)):
                slot += part
        stat = np.abs(flag_signed(*sums, zero))
        bcount = int(at_least(stat, obs).sum())
        p = (bcount + 1) / (m + 1)
        row["p"], row["exact"], row["draws"] = p, False, m
        row["se_p"] = math.sqrt(p * (1 - p) / m)

    # percentile bootstrap within firm x stratum
    B = C["BOOTSTRAP_DRAWS"]
    rng = rng_for(slug, rid, PURPOSE_BOOTSTRAP)
    sums = [np.zeros(B) for _ in range(4)]
    for kA, cA, kB, cB in strata:
        ia = rng.integers(0, len(kA), size=(B, len(kA)))
        ib = rng.integers(0, len(kB), size=(B, len(kB)))
        parts = mh_parts(
            kA[ia].sum(axis=1).astype(float),
            cA[ia].sum(axis=1).astype(float),
            kB[ib].sum(axis=1).astype(float),
            cB[ib].sum(axis=1).astype(float),
        )
        for slot, part in zip(sums, parts):
            slot += part
    draws = flag_signed(*sums, zero)
    lo, hi, se_lo, se_hi, used = interval(draws, C["CONFIDENCE"])
    row.update(lo=lo, hi=hi, se_lo=se_lo, se_hi=se_hi, bootDraws=used)
    return row


# ---------------------------------------------------------------- trends


def ts_pairs(x: np.ndarray, y: np.ndarray):
    """Every pair with distinct years: slope (later minus earlier, as scipy forms it),
    sorted, with the earlier and later report index of each."""
    n = len(x)
    i, j = np.triu_indices(n, 1)
    dx = x[j] - x[i]
    keep = dx != 0
    i, j, dx = i[keep], j[keep], dx[keep]
    later = np.where(dx > 0, j, i)
    earlier = np.where(dx > 0, i, j)
    s = (y[later] - y[earlier]) / (x[later] - x[earlier])
    order = np.argsort(s, kind="stable")
    return s[order], earlier[order], later[order]


def weighted_median(s: np.ndarray, W: np.ndarray) -> np.ndarray:
    """Row-wise median of the sorted values s repeated W[k, p] times (NaN when empty).
    Even count: mean of the two middle values, as np.median."""
    out = np.full(W.shape[0], np.nan)
    if s.size == 0:
        return out
    # int32 is enough: a row's total is at most n(n-1)/2 pairs
    cum = np.cumsum(W, axis=1, dtype=np.int32)
    M = cum[:, -1]
    for k in np.flatnonzero(M > 0):
        p1 = np.searchsorted(cum[k], (M[k] - 1) // 2, side="right")
        p2 = np.searchsorted(cum[k], M[k] // 2, side="right")
        out[k] = (s[p1] + s[p2]) / 2
    return out


def chunk_rows(P: int) -> int:
    return max(1, min(CHUNK, CELLS // max(P, 1)))


def ts_slope(x, y):
    if len(np.unique(x)) < 2:
        return None
    return float(stats.theilslopes(y, x)[0])


def mk_S(x, y) -> int:
    i, j = np.triu_indices(len(x), 1)
    return int((np.sign(x[j] - x[i]) * np.sign(y[j] - y[i])).sum())


def mk_S_perms(g: np.ndarray, Sy: np.ndarray, G: int, perms: np.ndarray) -> np.ndarray:
    """Mann-Kendall S for many reassignments of years.

    Report i gets the year group g[perms[k, i]]. With Sy[i, j] = sign(y_j - y_i),
    S = sum over (i, j) with group_i < group_j of Sy[i, j]; Sy @ onehot(groups) gives,
    per report and permutation, the sum over each group, done for a chunk at once.
    """
    K, n = perms.shape
    gp = g[perms]  # (K, n)
    H = np.zeros((n, K, G))
    H[np.arange(n)[None, :], np.arange(K)[:, None], gp] = 1.0
    Msy = (Sy @ H.reshape(n, K * G)).reshape(n, K, G)
    above = np.flip(np.cumsum(np.flip(Msy, axis=2), axis=2), axis=2)  # sum over groups >= b
    above = np.concatenate([above, np.zeros((n, K, 1))], axis=2)
    S = above[np.arange(n)[None, :], np.arange(K)[:, None], gp + 1].sum(axis=1)
    return np.rint(S).astype(np.int64)


def trend_series(firm, measure):
    dated = [r for r in firm["reports"] if r["year"] is not None]
    x = np.array([r["year"] for r in dated], dtype=float)
    if measure == "score":
        y = np.array([r["score"] for r in dated], dtype=float)
    else:
        y = np.array([100 * r[measure] / r["claims"] for r in dated], dtype=float)
    return x, y


def trend_ok(x, C) -> bool:
    return len(x) >= C["TREND_MIN_REPORTS"] and len(np.unique(x)) >= C["TREND_MIN_YEARS"]


def trend_boot(slug, rid, x, y, C) -> np.ndarray:
    s, e1, e2 = ts_pairs(x, y)
    n = len(x)
    B = C["BOOTSTRAP_DRAWS"]
    rng = rng_for(slug, rid, PURPOSE_BOOTSTRAP)
    out = np.empty(B)
    step = chunk_rows(len(s))
    for start in range(0, B, step):
        k = min(step, B - start)
        Wr = counts_per_row(rng.integers(0, n, size=(k, n)), n)
        out[start : start + k] = weighted_median(s, Wr[:, e1] * Wr[:, e2])
    return out


def trend_row(slug, rid, x, y, C, boot_cache):
    years = int(len(np.unique(x)))
    row = empty_row([int(len(x))])
    row["years"] = years
    slope = ts_slope(x, y)
    row["estimate"] = slope
    if not trend_ok(x, C):
        return row

    # our weighted-median Theil-Sen agrees with scipy on the observed data
    s, e1, e2 = ts_pairs(x, y)
    mine = weighted_median(s, np.ones((1, len(s)), dtype=np.int64))[0]
    assert abs(mine - slope) <= 1e-12 * max(1.0, abs(slope)), (rid, mine, slope)

    S_obs = mk_S(x, y)
    tau = stats.kendalltau(x, y).statistic
    n = len(x)
    n0 = n * (n - 1) / 2
    _, tx = np.unique(x, return_counts=True)
    _, ty = np.unique(y, return_counts=True)
    n1 = (tx * (tx - 1) / 2).sum()
    n2 = (ty * (ty - 1) / 2).sum()
    if (n0 - n1) * (n0 - n2) > 0:
        S_tau = tau * math.sqrt((n0 - n1) * (n0 - n2))
        assert abs(S_tau - S_obs) < 1e-6, (rid, S_tau, S_obs)
    row["stat"] = abs(S_obs)

    ux, g = np.unique(x, return_inverse=True)
    G = len(ux)
    Sy = np.sign(y[None, :] - y[:, None])
    ident = np.arange(n)[None, :]
    assert mk_S_perms(g, Sy, G, ident)[0] == S_obs

    if math.factorial(n) <= EXACT_LIMIT:
        perms = np.array(list(itertools.permutations(range(n))), dtype=np.int64)
        Sall = mk_S_perms(g, Sy, G, perms)
        row["p"] = float(at_least(np.abs(Sall).astype(float), S_obs).mean())
        row["exact"], row["draws"], row["se_p"] = True, int(len(perms)), 0.0
    else:
        m = C["PERMUTATION_DRAWS"]
        rng = rng_for(slug, rid, PURPOSE_PERMUTATION)
        bcount = 0
        checked = False
        for start in range(0, m, CHUNK):
            k = min(CHUNK, m - start)
            perms = np.argsort(rng.random((k, n)), axis=1)
            Sk = mk_S_perms(g, Sy, G, perms)
            if not checked:  # spot-check the matrix form against the direct sum
                for q in range(3):
                    assert Sk[q] == mk_S(x[perms[q]], y)
                checked = True
            bcount += int(at_least(np.abs(Sk).astype(float), S_obs).sum())
        p = (bcount + 1) / (m + 1)
        row["p"], row["exact"], row["draws"] = p, False, m
        row["se_p"] = math.sqrt(p * (1 - p) / m)

    draws = trend_boot(slug, rid, x, y, C)
    boot_cache[rid] = draws
    lo, hi, se_lo, se_hi, used = interval(draws, C["CONFIDENCE"])
    row.update(lo=lo, hi=hi, se_lo=se_lo, se_hi=se_hi, bootDraws=used)
    return row


def trendgap_row(slug, rid, xa, ya, xb, yb, C, boot_a, boot_b):
    row = empty_row([int(len(xa)), int(len(xb))])
    sa, sb = ts_slope(xa, ya), ts_slope(xb, yb)
    row["slopeA"], row["slopeB"] = sa, sb
    if sa is None or sb is None:
        return row
    row["estimate"] = sa - sb
    if not (trend_ok(xa, C) and trend_ok(xb, C)):
        return row

    obs = abs(sa - sb)
    row["stat"] = obs
    x = np.concatenate([xa, xb])
    y = np.concatenate([ya, yb])
    s, e1, e2 = ts_pairs(x, y)
    N, na = len(x), len(xa)

    def gap_stats(L):
        La, Lb = L[:, e1], L[:, e2]
        mA = weighted_median(s, La & Lb)
        mB = weighted_median(s, ~La & ~Lb)
        return np.abs(mA - mB)  # NaN when either group sits in one year

    actual = np.zeros((1, N), dtype=bool)
    actual[0, :na] = True
    assert abs(gap_stats(actual)[0] - obs) <= 1e-12 * max(1.0, obs), (rid,)

    total = math.comb(N, na)
    step = chunk_rows(len(s))
    if total <= EXACT_LIMIT:
        subsets = all_subsets(N, na)
        bcount = 0
        for start in range(0, total, step):
            sub = subsets[start : start + step]
            L = np.zeros((len(sub), N), dtype=bool)
            L[np.arange(len(sub))[:, None], sub] = True
            st = gap_stats(L)
            bcount += int((~np.isnan(st) & at_least(np.nan_to_num(st, nan=-1.0), obs)).sum())
        row["p"] = bcount / total
        row["exact"], row["draws"], row["se_p"] = True, int(total), 0.0
    else:
        m = C["PERMUTATION_DRAWS"]
        rng = rng_for(slug, rid, PURPOSE_PERMUTATION)
        bcount = 0
        for start in range(0, m, step):
            k = min(step, m - start)
            sub = sample_subsets(rng, k, N, na)
            L = np.zeros((k, N), dtype=bool)
            L[np.arange(k)[:, None], sub] = True
            st = gap_stats(L)
            bcount += int((~np.isnan(st) & at_least(np.nan_to_num(st, nan=-1.0), obs)).sum())
        p = (bcount + 1) / (m + 1)
        row["p"], row["exact"], row["draws"] = p, False, m
        row["se_p"] = math.sqrt(p * (1 - p) / m)

    draws = boot_a - boot_b  # paired by draw index; NaN where either is undefined
    lo, hi, se_lo, se_hi, used = interval(draws, C["CONFIDENCE"])
    row.update(lo=lo, hi=hi, se_lo=se_lo, se_hi=se_hi, bootDraws=used)
    return row


# ---------------------------------------------------------------- selection


def type_strata(firm_a, firm_b, types):
    out = []
    for t in types:
        ra = [r for r in firm_a["reports"] if r["type"] == t]
        rb = [r for r in firm_b["reports"] if r["type"] == t]
        if ra and rb:
            out.append((ra, rb))
    return out


def score_strata(groups):
    return [
        (np.array([r["score"] for r in ra], dtype=float), np.array([r["score"] for r in rb], dtype=float))
        for ra, rb in groups
    ]


def flag_strata(groups, m):
    def arr(rs, key):
        return np.array([r[key] for r in rs], dtype=np.int64)

    return [(arr(ra, m), arr(ra, "claims"), arr(rb, m), arr(rb, "claims")) for ra, rb in groups]


def family(row_id: str) -> str:
    return row_id.split("-")[0]


def holm(rows: dict):
    fams: dict[str, list[str]] = {}
    for rid, row in rows.items():
        if row["p"] is not None:
            fams.setdefault(family(rid), []).append(rid)
    for ids in fams.values():
        adj = multipletests([rows[r]["p"] for r in ids], method="holm")[1]
        for r, pa in zip(ids, adj):
            rows[r]["pAdj"] = float(pa)


def run_selection(sel, C, timings):
    slug = sel["slug"]
    firms = sel["firms"]
    A = firms[0]
    measures = sel["measures"]
    rows: dict[str, dict] = {}

    def timed(rid, fn, *args):
        t0 = time.perf_counter()
        rows[rid] = fn(*args)
        timings.append((slug, rid, time.perf_counter() - t0))

    for j in range(1, len(firms)):
        Bf = firms[j]
        everything = [(A["reports"], Bf["reports"])]
        by_type = type_strata(A, Bf, sel["types"])
        timed(f"score-{j}", score_row, slug, f"score-{j}", score_strata(everything), C)
        timed(f"scoretype-{j}", score_row, slug, f"scoretype-{j}", score_strata(by_type), C)
        for m in measures:
            timed(f"flag-{m}-{j}", flag_row, slug, f"flag-{m}-{j}", flag_strata(everything, m), C)
            timed(f"flagtype-{m}-{j}", flag_row, slug, f"flagtype-{m}-{j}", flag_strata(by_type, m), C)

    boot_cache: dict[str, np.ndarray] = {}
    series = {}
    for m in ["score", *measures]:
        for i, firm in enumerate(firms):
            x, y = trend_series(firm, m)
            series[(m, i)] = (x, y)
            rid = f"trend-{m}-{i}"
            timed(rid, trend_row, slug, rid, x, y, C, boot_cache)

    for m in ["score", *measures]:
        xa, ya = series[(m, 0)]
        for j in range(1, len(firms)):
            xb, yb = series[(m, j)]
            rid = f"trendgap-{m}-{j}"
            timed(
                rid,
                trendgap_row,
                slug,
                rid,
                xa,
                ya,
                xb,
                yb,
                C,
                boot_cache.get(f"trend-{m}-0"),
                boot_cache.get(f"trend-{m}-{j}"),
            )

    holm(rows)
    return rows


# ---------------------------------------------------------------- output


def clean(v):
    if isinstance(v, dict):
        return {k: clean(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [clean(x) for x in v]
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (float, np.floating)):
        f = float(v)
        if math.isnan(f):
            return None
        if math.isinf(f):
            return "Infinity" if f > 0 else "-Infinity"
        return f + 0.0  # -0.0 -> 0.0
    return v


def holm_check():
    ps = [0.01, 0.04, 0.03, 0.2, None, 0.005]
    given = [p for p in ps if p is not None]
    adj = iter(multipletests(given, method="holm")[1])
    return {"p": ps, "pAdj": [None if p is None else float(next(adj)) for p in ps]}


def main():
    t_start = time.perf_counter()
    data = json.loads(INPUT.read_text())
    C = {**DEFAULTS, **{k: v for k, v in data.get("constants", {}).items() if k in DEFAULTS}}
    assert C["BOOTSTRAP_DRAWS"] % BATCHES == 0

    timings: list[tuple[str, str, float]] = []
    out_sel = {}
    for sel in data["selections"]:
        t0 = time.perf_counter()
        out_sel[sel["slug"]] = run_selection(sel, C, timings)
        print(f"{sel['slug']}: {time.perf_counter() - t0:.1f}s", file=sys.stderr)

    out = {
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "method": "scripts/compare-reference.py",
        "input": str(INPUT.relative_to(ROOT)),
        "versions": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "scipy": scipy.__version__,
            "statsmodels": statsmodels.__version__,
        },
        "rng": {
            "generator": "numpy default_rng (PCG64)",
            "seed": SEED,
            "stream": "SeedSequence([seed, crc32(slug), crc32(row id), purpose]); purpose 1 permutation, 2 bootstrap",
        },
        "constants": {**C, "EXACT_LIMIT": EXACT_LIMIT, "BATCHES": BATCHES},
        "holm_check": holm_check(),
        "selections": out_sel,
    }
    OUTPUT.write_text(json.dumps(clean(out), indent=1, allow_nan=False) + "\n")

    slow = sorted(timings, key=lambda t: -t[2])[:5]
    for slug, rid, secs in slow:
        print(f"  slowest: {slug} {rid} {secs:.1f}s", file=sys.stderr)
    print(f"wrote {OUTPUT.relative_to(ROOT)} in {time.perf_counter() - t_start:.1f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
