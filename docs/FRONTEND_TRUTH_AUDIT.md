# ClearLC frontend truth audit

## Verified live configuration

- Mode: `LIVE`
- Network: Studio-dev / chain 61997
- Contract: `0x49Eba6C84256b81d8aEeED7A15f677f1A7A2C3e6`
- Source SHA: `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`
- Protocol version: `1.1.0`; schema: 34 methods; outgoing GEN release enabled
- Cases: `CLC-V110-PAYOUT-1791047316713`, `CLC-V110-REFUND-1791047316714`

## Truth guarantees

- `DEMO FIXTURE` and `STUDIO-DEV LIVE` are persistent, separate mode indicators.
- LIVE starts with no snapshots and only renders credits returned by canonical `get_credit_ids`/`get_credit` reads.
- A failed live read clears live snapshots and shows a canonical-read error. It never falls back to fixture state.
- Live navigation is derived from canonical credit IDs; demo IDs are not injected into live navigation.
- Finalized immutable snapshots may be cached in memory. Pending, accepted, failed, or incomplete state is never cached or presented as final.
- Reads are serialized, deduplicated in flight, and retried with bounded backoff for transient rate-limit/network errors.
- The live transaction panel shows canonical hashes only; synthetic recovery is DEMO-only.
- `SETTLEMENT_READY` is a deterministic contract gate; `SETTLED` additionally records the actual beneficiary payout.
- `REFUNDED` records the actual automatic applicant refund after funded expiry.
- Proof & Audit distinguishes semantic adjudication from payout/refund parent transactions and actual recipient balance deltas.
- Evidence is shown with immutable document identity, exact byte length, SHA-256, version, authority, and presentation binding. The source URI is transport only.
- Semantic output is bounded discrepancy support. Amount, recipient, deadlines, addresses, authorization, and settlement direction remain deterministic.

## v1.1 live cash truth

The v1.1 qualification is read from `0x49Eba6C84256b81d8aEeED7A15f677f1A7A2C3e6` and recorded in `artifacts/live-cash-qualification-v110.json`. The payout case is `SETTLED / BENEFICIARY_PAYOUT`; the refund case is `REFUNDED / APPLICANT_REFUND`. Both exact balance deltas are `1000000` base units and both post-exit liabilities are zero. Historical Case B remains preserved separately under the v1.0 deployment evidence.

## Remaining limitation

Studio-dev enforces a 30-requests/minute limit. The adapter handles transient throttling, but a browser pass can still need a clean rate-limit window. The UI surfaces the failure and does not invent state.
