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

The executable mutation gate defined and executed 28 cash/protocol mutants: 28 killed, 0 survived.

## Candidate release evidence

- Protocol version: `1.1.0`
- Candidate contract SHA-256: `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`
- Public schema method count: 34
- Historical deployment: preserved at `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8` with v1.0.1 evidence intact

## Deployment and live proof boundary

NEW CONTRACT SHA: `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`

NEW DEPLOYMENT: **PENDING until authorized**

LIVE PAYOUT PROOF: **PENDING**

LIVE REFUND PROOF: **PENDING**

No replacement deployment, live funding, beneficiary payout, applicant refund, production update, push, or v1.1.0 release tag has been performed.
