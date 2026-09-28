"""Strict Phase 2 semantic-result validator used by the test architecture.

The contract does not call this helper in Phase 1. It exists to make the
consensus boundary precise before the GenLayer adjudicator is implemented.
"""

from __future__ import annotations

import json
from typing import Any

MAX_SEMANTIC_OUTPUT_BYTES = 4096
SEMANTIC_KEYS = frozenset(
    {
        "selected_outcome",
        "event_occurred",
        "event_before_deadline",
        "confirmation_before_deadline",
        "authority_requirement_met",
        "corroboration_requirement_met",
        "evidence_conflict",
        "evidence_sufficient",
    }
)
ALLOWED_SELECTED_OUTCOMES = frozenset(
    {
        "YES",
        "NO",
        "INCONCLUSIVE",
        "INVALID_CHARTER",
        "INSUFFICIENT_EVIDENCE",
        "SOURCE_UNAVAILABLE",
        "EVIDENCE_CONFLICT",
    }
)
BOOL_KEYS = SEMANTIC_KEYS - {"selected_outcome"}


def validate_binary_event_result(raw: str) -> dict[str, Any]:
    """Parse and validate the exact bounded result or raise ``ValueError``."""

    if not isinstance(raw, str) or len(raw.encode("utf-8")) > MAX_SEMANTIC_OUTPUT_BYTES:
        raise ValueError("oversized semantic output")
    try:
        value = json.loads(raw)
    except Exception as exc:
        raise ValueError("malformed semantic JSON") from exc
    if not isinstance(value, dict) or set(value.keys()) != set(SEMANTIC_KEYS):
        raise ValueError("semantic keys must match the exact schema")
    selected = value["selected_outcome"]
    if not isinstance(selected, str) or selected not in ALLOWED_SELECTED_OUTCOMES:
        raise ValueError("unknown selected_outcome")
    for key in BOOL_KEYS:
        if type(value[key]) is not bool:
            raise ValueError(f"{key} must be boolean")

    sufficient = value["evidence_sufficient"]
    conflict = value["evidence_conflict"]
    if selected in {"YES", "NO"}:
        if not sufficient or conflict:
            raise ValueError("business outcome requires sufficient, conflict-free evidence")
        if selected == "YES" and (
            not value["event_occurred"] or not value["event_before_deadline"]
        ):
            raise ValueError("YES is inconsistent with occurrence timing")
        if selected == "NO" and value["event_before_deadline"]:
            raise ValueError("NO is inconsistent with occurrence timing")
    if selected == "INSUFFICIENT_EVIDENCE" and sufficient:
        raise ValueError("insufficient-evidence state must be insufficient")
    if selected == "SOURCE_UNAVAILABLE" and sufficient:
        raise ValueError("source-unavailable state must be insufficient")
    if selected == "EVIDENCE_CONFLICT" and not conflict:
        raise ValueError("evidence-conflict state must mark conflict")
    return value

