# Steward response: v1.1 cash exits

## Exact steward concern

> “The funded lifecycle has no cash exit: settle_credit records the amount and recipient but does not transfer GEN, and funded expiry has no refund path. Please add and test a one-time beneficiary payout and applicant refund path that preserve the existing accounting and lifecycle guards.”

## Root cause

The historical v1.0.1 contract accepted `gl.message.value` in `fund_credit`, but `settle_credit` only recorded settlement bookkeeping and `expire_credit` only changed lifecycle state. Escrowed native GEN could therefore enter ClearLC without a deterministic exit.

## Fix

The v1.1.0 candidate is native GEN only. Funding requires the applicant, an unfunded non-expired credit, exact `gl.message.value == credit.amount`, and `currency_label == "GEN"`. Deterministic settlement emits exactly `credit.amount` to the frozen beneficiary. A funded expiry automatically emits the full remaining escrow to the frozen applicant. Both paths check contract balance and escrow liability before emitting value and update accounting only after the transfer emission succeeds in the parent execution.

## Invariants

- A funded credit has at most one cash exit: `BENEFICIARY_PAYOUT` or `APPLICANT_REFUND`.
- The payout/refund amount is the deterministic funded amount; no caller or semantic output supplies amount or recipient.
- Escrow is cleared and `total_escrow_liability` decreases exactly once on the selected exit.
- Payout after refund, refund after payout, replayed payout/refund, and funding after expiry or an exit are rejected.
- Zero applicant and beneficiary addresses are rejected.

## Tests and mutation gate

Direct cash-path tests cover exact funding, payable guards, liability accounting, one-time payout, automatic funded-expiry refund, terminality, insolvency fail-closed behavior, zero addresses, native GEN scope, and deterministic routing. Adversarial and property tests preserve semantic/cash separation and lifecycle mutual exclusion.

The executable mutation gate defined and executed 28 mutants in total, including 19 cash-exit mutants: 28 total killed, 0 total survived; cash subset 19 defined, 19 executed, 19 killed, 0 survived.

## Candidate release evidence

- Protocol version: `1.1.0`
- Candidate contract SHA-256: `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`
- Public schema method count: 34
- Historical deployment: preserved at `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8` with v1.0.1 evidence intact

## Deployment and live proof boundary

NEW CONTRACT SHA: `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`

NEW DEPLOYMENT: `0x49Eba6C84256b81d8aEeED7A15f677f1A7A2C3e6` on Studio-dev chain `61997`

Deployment transaction: `0x469acc28f2be83ee1a4b922cb74e47b0d4822feb68e8da42f7a2f9736598a57f`

The deployment was broadcast exactly once. The initial SDK wait timed out while the transaction was still pending; the same transaction hash was reconciled read-only to `FINALIZED`, `FINISHED_WITH_RETURN`, and accepted. No replacement deployment was issued.

### Live beneficiary payout proof

- Case ID: `CLC-V110-PAYOUT-1791047316713`
- Amount: `1,000,000` native GEN base units
- Beneficiary: `0x6311dE989ab01Ae4Da77d36CC45d495fbCd4B7a8`
- Beneficiary balance: `5000267287749976126` → `5000267287750976126` (delta exactly `1,000,000`)
- Contract balance: `1,000,000` → `0`
- Settlement transaction: `0xcfc404d73ff8742d898c5f0568eb3f10490bd498c5fb5384f5c9abc62eb34d89`
- Readback: `SETTLED`, `BENEFICIARY_PAYOUT`, frozen beneficiary recipient, paid `1,000,000`, escrow `0`, liability `1,000,000` → `0`
- Audit: `CREDIT_FUNDED`, `SETTLEMENT_READY`, `BENEFICIARY_PAYOUT_EMITTED` exactly once

All Case A write hashes are recorded in `artifacts/live-cash-qualification-v110.json`.

### Live funded-expiry refund proof

- Case ID: `CLC-V110-REFUND-1791047316714`
- Amount: `1,000,000` native GEN base units
- Applicant: `0x61F10Cc252eD98Ce7596c73fC557cCA4cc600c82`
- Applicant balance: `210220564047432854` → `210220564048432854` (delta exactly `1,000,000`); the applicant did not trigger expiry
- Contract balance: `1,000,000` → `0`
- Expiry transaction: `0x35bf6eed60e38bf321af2f9cb313db5d25c29208e18c75c653e52a9565b40deb`
- Readback: `REFUNDED`, `APPLICANT_REFUND`, frozen applicant recipient, refunded `1,000,000`, escrow `0`, liability `1,000,000` → `0`
- Audit: `CREDIT_FUNDED`, `APPLICANT_EXPIRY_REFUND_EMITTED` exactly once

All Case B write hashes are recorded in `artifacts/live-cash-qualification-v110.json`.

### Final qualification accounting

- `total_escrow_liability = 0`
- `total_beneficiary_payouts = 1,000,000`
- `total_applicant_refunds = 1,000,000`
- Source parity: local and deployed SHA-256 both equal `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`
- Schema parity: 34 public methods

LIVE PAYOUT PROOF: **PASS — qualification only; not production evidence**

LIVE REFUND PROOF: **PASS — qualification only; not production evidence**

### Production cutover

- Final merged main HEAD: `e2d419bdcea6cbbccd080c5660fcd9af04d7f062`
- Production deployment: `dpl_CAe9JTqG8jaZR3zYTgdV8SdmMtWY`
- Production URL: `https://clearlc.vercel.app`
- Production status: `READY`; deployment source was the clean merged main checkout at the exact HEAD above
- Production bundle readback: canonical v1.1 contract, both v1.1 proof IDs, outgoing GEN release enabled, and no pending-deployment copy
- Read-only production proof pages rendered `SETTLED / BENEFICIARY_PAYOUT` and `REFUNDED / APPLICANT_REFUND` with the exact parent transaction hashes. A subsequent refresh encountered the documented Studio-dev RPC rate limit; the UI correctly showed canonical-read failure and did not fall back to fixtures.
- Production smoke: desktop, tablet, and mobile nonblank; horizontal overflow `0`; clean-window proof session console errors `0`

The remediation branch was merged through protected PR #1 with green contract, frontend, and provenance checks. The v1.1.0 GitHub release tag and Portal action remain publication steps recorded separately from the historical v1.0.1 evidence.
