# Bounded semantic adjudication

The only nondeterministic question in V1 is:

> Given the frozen documentary requirement, authenticated evidence bytes, the examiner's structured assertion, and the frozen ruleset reference, is the asserted discrepancy materially supported?

Allowed decisions:

- `VALID_DISCREPANCY`
- `INVALID_DISCREPANCY`
- `INCONCLUSIVE`

Allowed reason codes:

- `DOCUMENT_FUNCTION_NOT_FULFILLED`
- `MATERIAL_DATA_CONFLICT`
- `TITLE_ONLY_MISMATCH`
- `REQUIRED_CONTENT_PRESENT`
- `AMBIGUOUS_EVIDENCE`
- `INSUFFICIENT_RULE_SUPPORT`

The consensus-critical payload is exactly:

```json
{
  "decision": "INVALID_DISCREPANCY",
  "reason_code": "TITLE_ONLY_MISMATCH",
  "requirement_id": "REQ-QUALITY",
  "discrepancy_id": "DISC-QUALITY-001",
  "evidence_status": "AVAILABLE"
}
```

There is no authoritative confidence score or free-form explanation. The validator independently re-runs the same evidence retrieval and bounded task, then compares every decision-bearing field. Shape-only validation is explicitly insufficient.

The prompt treats document text and discrepancy text as untrusted data and rejects model attempts to add keys, alter IDs, or choose amount, recipient, address, deadlines, authorization, or settlement direction. Malformed output or evidence retrieval/integrity failure resolves only to `INCONCLUSIVE` with a separate status, or causes consensus disagreement/retry; it cannot become a valid adverse discrepancy.

The challenge fingerprint is derived deterministically from the active credit version, requirement ID, evidence-set hash, ruleset hash, and discrepancy ID. A finalized adjudication is stored under that fingerprint. The same tuple cannot be rerun to result-shop; a new presentation or evidence version creates a new tuple.

The synthetic hero case requires `Certificate of Quality issued by an independent surveyor` while presenting a `Quality Inspection Certificate`. Its fixture bytes explicitly state the independent surveyor function, so a bounded judge can classify the title-only difference as `INVALID_DISCREPANCY` / `TITLE_ONLY_MISMATCH`.

