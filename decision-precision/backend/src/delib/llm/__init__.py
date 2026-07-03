"""LLM integration (Phase 4): the single interface + the three roles."""

from .apply import code_node, grade_edge
from .config import LLMSettings
from .generator import LLMGenerator
from .interface import LLM, LLMError

__all__ = [
    "LLM",
    "LLMError",
    "LLMSettings",
    "LLMGenerator",
    "code_node",
    "grade_edge",
]
