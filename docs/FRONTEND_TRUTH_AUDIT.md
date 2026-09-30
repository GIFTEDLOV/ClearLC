# ClearLC frontend truth audit

## Verified live configuration

- Mode: `LIVE`
- Network: Studio-dev / chain 61997
- Contract: `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8`
- Source SHA: `f6492afe3b9ab5913bb7a44e8420a916a91558787212ac27c93d382456e61384`
- Case: `CLC-LIVE-CB-1790698367`

## Truth guarantees

- `DEMO FIXTURE` and `STUDIO-DEV LIVE` are persistent, separate mode indicators.
- LIVE starts with no snapshots and only renders credits returned by canonical `get_credit_ids`/`get_credit` reads.
- A failed live read clears live snapshots and shows a canonical-read error. It never falls back to fixture state.
- Live navigation is derived from canonical credit IDs; demo IDs are not injected into live navigation.
- Finalized immutable snapshots may be cached in memory. Pending, accepted, failed, or incomplete state is never cached or presented as final.
- Reads are serialized, deduplicated in flight, and retried with bounded backoff for transient rate-limit/network errors.
- The live transaction panel shows canonical hashes only; synthetic recovery is DEMO-only.
- `SETTLEMENT_READY` is a deterministic contract gate, not recipient payment.
- `SETTLED IN CONTRACT ACCOUNTING` is distinct from beneficiary GEN transfer. Outgoing transfer remains disabled.
- Evidence is shown with immutable document identity, exact byte length, SHA-256, version, authority, and presentation binding. The source URI is transport only.
- Semantic output is bounded discrepancy support. Amount, recipient, deadlines, addresses, authorization, and settlement direction remain deterministic.

## Live Case B truth

The live qualification is read from deployment #4 and recorded in `artifacts/staged-caseb-qualification.json`: `INVALID_DISCREPANCY / REQUIRED_CONTENT_PRESENT`, evidence `AVAILABLE`, `SETTLED`, accounting booked `250000`, one adjudication attempt, zero result shopping.

## Remaining limitation

Studio-dev enforces a 30-requests/minute limit. The adapter handles transient throttling, but a browser pass can still need a clean rate-limit window. The UI surfaces the failure and does not invent state.
