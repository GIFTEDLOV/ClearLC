# CharterLock Protocol — Architecture Lock

Status: frozen for Phase 0/1 review

## Non-negotiable trust problem

CharterLock prevents a platform administrator, post-event clarification,
token-holder vote, single oracle, single model, or losing party from redefining
a natural-language rule or controlling its result after exposure exists.

The protocol is GenLayer-native semantic adjudication infrastructure. Its first
production schema is `BINARY_EVENT_V1`; event-contract-style resolution is only
the first demonstration, not the product boundary.

This project may not pivot away from CharterLock's locked trust problem,
Resolution Charter primitive, authority-bound evidence model, bounded semantic
adjudication, or append-only challenge lineage without explicit operator
authorization.

## Locked execution pipeline

```text
deterministic input/evidence gate
  -> authenticated/bound facts
  -> bounded semantic question
  -> strict model-output validation
  -> GenLayer consensus/custom equivalence
  -> deterministic state consequence
  -> canonical readback/provenance
```

Validators never control IDs, addresses, payments, deadlines, authority
definitions, allowed outcomes, challenge limits, lifecycle legality,
administrative permissions, evidence identity, or settlement mechanics.

## Phase 1 storage model

The contract uses flat `TreeMap[str, str]` records containing canonical JSON.
This keeps storage ABI evolution explicit and avoids coupling future semantic
fields to a nested storage layout.

- `charter_records`: frozen charter fields, state, and charter hash.
- `authority_records`: authority rules keyed by `charter_id::authority_id`.
- `case_records`: case state, charter snapshot hash, evidence root, and active
  resolution pointer.
- `evidence_records`: append-only evidence metadata, transport URL, normalized
  hostname, SHA-256, byte length, timestamps, and admissibility state.
- `resolution_records`: future bounded semantic results and generation metadata.
- `challenge_records`: challenge grounds and lineage pointers.
- `*_ids` arrays and history maps: stable enumeration and append-only readback.

Counters generate monotonic IDs. No caller or validator supplies a protocol
ID. Frozen charter fields are written once, and no privileged override path is
present.

## State model

Charter: `DRAFT -> FROZEN`.

Case: `OPEN -> EVIDENCE_SEALED -> ADJUDICATED -> CHALLENGEABLE ->
CHALLENGED -> READJUDICATED -> FINAL`.

Phase 1 implements the deterministic transitions through evidence sealing and
stores challenge/resolution scaffolding. `adjudicate`, `readjudicate`, and
finalization fail closed until the Phase 2 semantic adjudicator is implemented;
they do not manufacture `YES` or `NO`.

## Public surface

The contract exposes charter, case, evidence, adjudication-boundary,
challenge-boundary, and canonical read APIs. It intentionally has no
`set_outcome`, `override_verdict`, `force_resolve`, charter mutation after
freeze, evidence-history replacement, or final-case reopening method.

