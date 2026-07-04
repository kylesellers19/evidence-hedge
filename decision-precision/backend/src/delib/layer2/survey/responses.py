"""Response-data path (A6, tier 3 — stub, ready for the authors' anonymized data).

Expected input (per the methodology block): one dict per respondent, keyed by
answer-option variable, values in {-2, -1, 0, +1, +2}. A missing/None value means
the respondent is EXCLUDED for that variable (the paper excludes respondents who
gave non-neutral 'other' answers from the relevant pairs) — so correlations are
computed pairwise-complete: each pair uses only respondents who answered both.

This is the authoritative tier: RESPONSE_DATA overrides SITE_SCRAPE and
PUBLISHED_TABLE in the store.
"""

from __future__ import annotations

from pydantic import BaseModel

from .store import CorrelationStore, SourceTier

Respondent = dict[str, float | None]


class ResponseCorrelation(BaseModel):
    var_a: str
    var_b: str
    r: float
    n: int


def _variables(responses: list[Respondent]) -> list[str]:
    seen: dict[str, None] = {}
    for row in responses:
        for k in row:
            seen.setdefault(k, None)
    return list(seen)


def compute_correlation_matrix(
    responses: list[Respondent], variables: list[str] | None = None
) -> list[ResponseCorrelation]:
    """Pairwise-complete Pearson r over the respondent rows. Pairs with fewer
    than 2 complete respondents, or zero variance in either variable, are
    skipped (r undefined)."""
    import numpy as np
    from scipy.stats import pearsonr

    variables = variables or _variables(responses)
    out: list[ResponseCorrelation] = []
    for i in range(len(variables)):
        for j in range(i + 1, len(variables)):
            va, vb = variables[i], variables[j]
            xs, ys = [], []
            for row in responses:
                a, b = row.get(va), row.get(vb)
                if a is not None and b is not None:
                    xs.append(float(a))
                    ys.append(float(b))
            n = len(xs)
            if n < 2:
                continue
            x, y = np.asarray(xs), np.asarray(ys)
            if x.std() == 0 or y.std() == 0:
                continue
            r = float(pearsonr(x, y)[0])
            out.append(ResponseCorrelation(var_a=va, var_b=vb, r=r, n=n))
    return out


def load_response_correlations(
    store: CorrelationStore,
    responses: list[Respondent],
    variables: list[str] | None = None,
) -> int:
    """Compute and load into the store at the authoritative RESPONSE_DATA tier."""
    added = 0
    for c in compute_correlation_matrix(responses, variables):
        if store.add(c.var_a, c.var_b, c.r, c.n, SourceTier.RESPONSE_DATA):
            added += 1
    return added


__all__ = ["Respondent", "ResponseCorrelation", "compute_correlation_matrix", "load_response_correlations"]
