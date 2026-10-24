"""Budget as config — one dual meter over source credits AND LLM dollars.

Both meters are per session with hard caps; retrieval and grading check the meter
before spending and record after. Cache hits cost nothing (the meter only charges
network fetches and live LLM calls), and a staleness threshold decides when a
cached grade is old enough to re-spend on. The running total is exposed for the
frontend to display.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

_STRICT = ConfigDict(extra="forbid")


class BudgetExceeded(RuntimeError):
    """Raised when a spend would exceed a per-session cap."""

    def __init__(self, meter: str, have: float, cap: float) -> None:
        super().__init__(f"budget cap reached for {meter}: {have} would exceed {cap}")
        self.meter = meter


class BudgetConfig(BaseModel):
    model_config = _STRICT
    # per-session hard caps (None = unlimited)
    openalex_credit_cap: int | None = None
    llm_dollar_cap: float | None = None
    # per-source soft rate limit (min seconds between calls), advisory metadata
    source_min_interval_s: dict[str, float] = Field(default_factory=dict)
    # a cached grade older than this (seconds) is eligible for re-grade
    staleness_threshold_s: float = 30 * 24 * 3600  # 30 days
    # rough per-1k-token USD price by model substring, for LLM cost estimation
    llm_price_per_1k: dict[str, float] = Field(
        default_factory=lambda: {"opus": 0.015, "sonnet": 0.003, "haiku": 0.0008}
    )

    def price_for(self, model: str) -> float:
        m = model.lower()
        for key, price in self.llm_price_per_1k.items():
            if key in m:
                return price
        return 0.003  # default to sonnet-tier


class BudgetMeter:
    """Mutable per-session spend tracker. Not thread-safe (one session, one loop)."""

    def __init__(self, config: BudgetConfig | None = None) -> None:
        self.config = config or BudgetConfig()
        self.openalex_credits: int = 0
        self.llm_dollars: float = 0.0
        self.source_calls: dict[str, int] = {}

    # --- source credits (OpenAlex is the metered one; others counted too) ---

    def check_source(self, name: str, credits: int = 1) -> None:
        cap = self.config.openalex_credit_cap
        if name == "openalex" and cap is not None and self.openalex_credits + credits > cap:
            raise BudgetExceeded("openalex", self.openalex_credits + credits, cap)

    def record_source(self, name: str, credits: int = 1) -> None:
        self.source_calls[name] = self.source_calls.get(name, 0) + 1
        if name == "openalex":
            self.openalex_credits += credits

    # --- LLM dollars --------------------------------------------------------

    def estimate_llm_cost(self, model: str, total_tokens: int) -> float:
        return self.config.price_for(model) * (total_tokens / 1000.0)

    def check_llm(self, dollars: float) -> None:
        cap = self.config.llm_dollar_cap
        if cap is not None and self.llm_dollars + dollars > cap:
            raise BudgetExceeded("llm", round(self.llm_dollars + dollars, 4), cap)

    def record_llm(self, dollars: float) -> None:
        self.llm_dollars += dollars

    # --- staleness ----------------------------------------------------------

    def is_stale(self, graded_at: float | None, now: float) -> bool:
        """True when a snapshot is missing or older than the staleness threshold."""
        return graded_at is None or (now - graded_at) > self.config.staleness_threshold_s

    # --- exposure -----------------------------------------------------------

    def snapshot(self) -> dict:
        return {
            "openalex_credits": self.openalex_credits,
            "openalex_credit_cap": self.config.openalex_credit_cap,
            "llm_dollars": round(self.llm_dollars, 4),
            "llm_dollar_cap": self.config.llm_dollar_cap,
            "source_calls": dict(self.source_calls),
        }


__all__ = ["BudgetExceeded", "BudgetConfig", "BudgetMeter"]
