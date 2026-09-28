# ClearLC frontend truth audit

Phase 3 review of the words used by the reviewer application.

## Corrections applied

- `DEMO FIXTURE` and `STUDIO-DEV LIVE` are separate, persistent mode indicators.
- Live mode with no configured contract address renders an explicit unconfigured state; it never falls back to fixture data.
- `SETTLEMENT_READY` is labelled as a deterministic contract gate, not as recipient payment.
- `SETTLED IN CONTRACT ACCOUNTING` is distinct from a beneficiary receiving GEN. Outgoing GEN transfer remains disabled.
- `INVALID_DISCREPANCY` is not rendered as a waiver. The proof view states that `VALID_DISCREPANCY + WAIVED` is a separate fact pattern.
- `INCONCLUSIVE`, `REVIEW_REQUIRED`, and unresolved challenges remain blocking states in the gate list.
- A finalized transaction with failed execution or failed canonical readback is not treated as success by the transaction layer.
- Evidence is shown with immutable IDs, exact byte length, SHA-256, version, authority, and presentation binding. Source URI is explicitly labelled a transport hint.
- Semantic output is described as bounded discrepancy support only. Amount, recipient, deadlines, addresses, authorization, and settlement direction are shown as deterministic facts.
- Fixture transaction hashes are labelled fixture records and cannot be mistaken for network hashes.

## Remaining limitations

- No deployed contract address exists in this phase, so live mode is read/write-ready but intentionally unconfigured.
- The fixture adapter simulates action completion for reviewer workflows; it does not claim a chain write.
- Recipient-side GEN transfer is not enabled or represented as complete.
