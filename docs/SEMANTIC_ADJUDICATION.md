# Bounded semantic adjudication

The only nondeterministic question is:

> Given the frozen credit version, documentary requirement, authenticated
> evidence, examiner assertion, and frozen ruleset, is the asserted discrepancy
> materially supported?

Allowed decisions are exactly `VALID_DISCREPANCY`, `INVALID_DISCREPANCY`, and
`INCONCLUSIVE`. Reason codes are the fixed six codes in the contract.

The frozen input includes credit ID/version, presentation ID, requirement ID,
discrepancy ID, ruleset ID/hash, evidence-set fingerprint, relevant evidence
metadata/bytes, and asserted discrepancy. The output schema is exactly:

```json
{
  "decision": "INVALID_DISCREPANCY",
  "reason_code": "TITLE_ONLY_MISMATCH",
  "requirement_id": "REQ-QUALITY",
  "discrepancy_id": "DISC-QUALITY-001",
  "evidence_status": "AVAILABLE"
}
```

The parser rejects malformed JSON, wrong types, missing or extra keys, unknown
enums, wrong IDs, invalid evidence statuses, oversized output, and any output
that tries to select amount, recipient, address, deadline, authorization, or
settlement direction. There is no authoritative confidence score or prose.

Document bytes, titles, issuer names, discrepancy text, semantic clauses, rule
references, and retrieved web text are untrusted prompt data inside explicit
markers. The controlled tests include instruction-injection variants and a
model output attempting to add `amount` and `recipient`; both resolve only to
`INCONCLUSIVE`.

The validator independently invokes the same bounded evidence retrieval and
semantic task, validates the strict schema, and compares every decision-bearing field. It is not shape-only validation, and no non-decision-bearing prose can change the outcome.

The adjudication fingerprint binds credit version, presentation identity,
requirement ID, discrepancy ID, ruleset hash, and evidence-set fingerprint.
The first finalized result is immutable. An inconclusive result cannot be
rerun for that tuple, preventing result-shop behavior; a new cure/replacement
presentation creates a new tuple.

The synthetic hero case requires `Certificate of Quality issued by an
independent surveyor` while presenting a `Quality Inspection Certificate`.
Its authenticated bytes contain the required function, so the bounded result
is `INVALID_DISCREPANCY` / `TITLE_ONLY_MISMATCH`.
