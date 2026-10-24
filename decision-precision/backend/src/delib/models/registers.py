"""The register clash table (Boltanski & Thévenot, *On Justification*, plus the
projective/network order from Boltanski & Chiapello and the green order).

A consequence that engages two CLASHING orders of worth carries an internal
tension (the "differend": their evaluation principles cannot both be honored).
Pairs that form a recognized COMPROMISE are explicitly SUPPRESSED — their
co-occurrence is a settled arrangement, not a live tension, so it is never drawn.

Author-curated and provenance-tagged; edit freely. Symmetric (unordered pairs).
"""

from __future__ import annotations

from .enums import Register

R = Register


def _pair(a: Register, b: Register) -> frozenset[Register]:
    return frozenset({a, b})


# Live differends — principles that directly conflict.
CLASH_PAIRS: frozenset[frozenset[Register]] = frozenset(
    {
        _pair(R.MARKET, R.CIVIC),      # price vs collective solidarity
        _pair(R.MARKET, R.INSPIRED),   # commerce vs creation for its own sake
        _pair(R.MARKET, R.GREEN),      # commodification vs ecological worth
        _pair(R.MARKET, R.DOMESTIC),   # transactional vs bonds of loyalty
        _pair(R.INDUSTRIAL, R.DOMESTIC),  # efficiency/standardization vs tradition
        _pair(R.INDUSTRIAL, R.INSPIRED),  # planning vs spontaneity
        _pair(R.INDUSTRIAL, R.GREEN),  # productivity vs ecological limits
        _pair(R.INDUSTRIAL, R.FAME),   # technical merit vs reputation/opinion
        _pair(R.CIVIC, R.DOMESTIC),    # universal rule vs particular ties
        _pair(R.CIVIC, R.FAME),        # general will vs celebrity/opinion
        _pair(R.INSPIRED, R.FAME),     # authentic vision vs public renown
    }
)

# Recognized compromises — settled arrangements, suppressed (never a tension).
COMPROMISE_PAIRS: frozenset[frozenset[Register]] = frozenset(
    {
        _pair(R.MARKET, R.INDUSTRIAL),   # the standard "efficient enterprise"
        _pair(R.INDUSTRIAL, R.CIVIC),    # public infrastructure / the service state
        _pair(R.DOMESTIC, R.INSPIRED),   # craft tradition carrying creativity
        _pair(R.CIVIC, R.GREEN),         # environmental citizenship / the commons
        _pair(R.PROJECTIVE, R.MARKET),   # the networked / project economy
        _pair(R.PROJECTIVE, R.INSPIRED), # projects as vehicles for vision
        _pair(R.FAME, R.MARKET),         # brand value / reputation as an asset
    }
)


def register_clashes(registers: set[Register]) -> list[tuple[Register, Register]]:
    """Clashing register pairs present in ``registers`` (compromise pairs
    suppressed). Each pair is returned once, ordered by the enum's declaration
    order for stable output."""
    order = list(Register)
    out: list[tuple[Register, Register]] = []
    regs = sorted(registers, key=order.index)
    for i, a in enumerate(regs):
        for b in regs[i + 1 :]:
            pair = _pair(a, b)
            if pair in CLASH_PAIRS and pair not in COMPROMISE_PAIRS:
                out.append((a, b))
    return out


__all__ = ["CLASH_PAIRS", "COMPROMISE_PAIRS", "register_clashes"]
