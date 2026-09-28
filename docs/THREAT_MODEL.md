# ClearLC threat model

## Trust boundaries

- Applicant, beneficiary, and examiner are authenticated workflow actors.
- Issuer metadata is committed evidence context, not an extra V1 workflow actor.
- Document bytes, titles, URLs, issuer text, semantic clauses, and discrepancy
  text are untrusted.
- Leader output is untrusted until a validator independently evaluates the same
  frozen evidence and bounded question.
- The frontend fixture is demo data, never live protocol state.

## Controls

| Threat | Control |
| --- | --- |
| Applicant blocks payment by assertion | Only a structured examiner discrepancy changes examination state; waiver is explicit and applicant-authorized. |
| Beneficiary forces payment by “close enough” | Requirements, evidence identity, version, deadline, and ruleset are frozen; semantic output is bounded. |
| URL/mirror changes identity | Exact bytes, SHA-256, length, document ID, credit, presentation, issuer, authority, and version are bound. |
| Cross-credit or stale evidence | Active credit/version/presentation checks plus globally protected document IDs. |
| Evidence overwrite | Evidence and presentations use immutable IDs; replacement is a new version and new presentation. |
| Result shopping | Fingerprint includes presentation identity and all frozen decision inputs; finalized tuples cannot rerun. |
| Prompt injection | All semantic text is untrusted data; exact schema rejects control fields and prohibited payment choices. |
| Validator shape-only approval | Validator repeats substantive evidence retrieval and bounded semantic evaluation. |
| Retrieval failure becomes adverse | Availability, hash, length, malformed bytes, and semantic inconclusive statuses remain distinct. |
| Settlement without compliance | Canonical requirement matrix rows, discrepancy resolution, current presentation, escrow, and expiry are checked. |
| Double/expired settlement | Terminal state, zero booked amount, exact escrow, and expiry guards are deterministic. |
| Protocol fee confusion | Later transaction adapter keeps payable `value` separate from `fees.feeValue`; no live write exists in Phase 2. |
