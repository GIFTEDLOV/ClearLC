# ClearLC submission package

## Project name

ClearLC

## One-line pitch

Documentary settlement without arbitrary discrepancy blocking.

## Short description

ClearLC turns documentary trade settlement into a reconstructable protocol: terms, evidence, versions, and objective checks are frozen first; GenLayer evaluates only a bounded semantic discrepancy; deterministic contract gates decide whether settlement accounting can proceed.

## Problem

Documentary credits can be blocked by vague claims that a document is “wrong” even when the underlying required content is present. Evidence may be transported through mutable URLs, and a semantic decision can be confused with a payment instruction.

## Solution

ClearLC binds evidence to exact bytes and metadata, records per-requirement objective checks, freezes a challenged discrepancy, and applies the first valid bounded semantic result to deterministic state-machine gates. Settlement exits native GEN exactly once only after canonical postconditions pass: the frozen beneficiary is paid on settlement, or the frozen applicant is refunded automatically on funded expiry.

## Why GenLayer

GenLayer is used for the narrow question that deterministic code cannot answer safely: whether a formally asserted discrepancy is materially supported by the frozen requirement and authenticated presentation. It does not choose amount, recipient, deadline, authority, or settlement direction.

## What is semantic

The discrepancy-support decision and reason code: live Case B finalized as `INVALID_DISCREPANCY / REQUIRED_CONTENT_PRESENT` with evidence status `AVAILABLE`.

## What remains deterministic

Credit terms, parties, amount, deadlines, versioning, evidence identity, authority binding, presentation binding, requirement roots, lifecycle legality, challenge windows, settlement eligibility, booked accounting, and replay protection.

## v1.1.0 live proof

- Canonical contract: `0x49Eba6C84256b81d8aEeED7A15f677f1A7A2C3e6`
- Historical v1.0 deployment: `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8` — **HISTORICAL / PRE-CASH-EXIT RELEASE**
- Network: Studio-dev, chain 61997
- Source SHA: `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`
- Deployment tx: `0x469acc28f2be83ee1a4b922cb74e47b0d4822feb68e8da42f7a2f9736598a57f`
- Protocol version: `1.1.0`; schema: 34 methods; outgoing value release: enabled
- Payout case: `CLC-V110-PAYOUT-1791047316713`, `SETTLED`, `BENEFICIARY_PAYOUT`, amount `1000000`, tx `0xcfc404d73ff8742d898c5f0568eb3f10490bd498c5fb5384f5c9abc62eb34d89`
- Refund case: `CLC-V110-REFUND-1791047316714`, `REFUNDED`, `APPLICANT_REFUND`, amount `1000000`, tx `0x35bf6eed60e38bf321af2f9cb313db5d25c29208e18c75c653e52a9565b40deb`
- Qualification: 9 cash tests, 45 full regression, 19/19 executable cash mutants killed, 30/30 Playwright, audit 0/0/0/0

- Live app: https://clearlc.vercel.app
- GitHub: https://github.com/GIFTEDLOV/ClearLC

## ~300-character summary

ClearLC is a documentary trade-settlement protocol that prevents vague discrepancy claims from arbitrarily blocking payment. It freezes terms and exact evidence, sends only bounded semantic questions to GenLayer, and keeps amount, authority, lifecycle, and settlement accounting deterministic.

## ~1000-character description

ClearLC addresses a practical trust problem in documentary trade finance: a payment can be blocked by a disputed document label even when the required content is present. The protocol freezes credit terms, requirement versions, evidence metadata, exact byte length, SHA-256 identity, authority, presentation binding, and discrepancy context before asking a semantic question. GenLayer is deliberately scoped to the smallest non-deterministic question—whether the asserted discrepancy is materially supported. An independent validator checks stable decision fields; prose is not a payment instruction. The contract then applies deterministic lifecycle, challenge, settlement-readiness, accounting, and cash-exit gates. The v1.1.0 Studio-dev proofs demonstrate one-time beneficiary payout and automatic funded-expiry applicant refund. Consensus never selects cash amount or recipient.

## Long-form description

ClearLC is an institutional documentary-credit operations desk backed by a GenLayer Intelligent Contract. Its central rule is simple: objective facts should not be re-decided by a model. Credit amount, parties, deadlines, document identity, authority, evidence bytes, version roots, presentation binding, and settlement legality are deterministic contract state. A formal discrepancy can still require interpretation, but that interpretation is bounded, fingerprinted, validated, attempted once, and accepted only when the canonical finalized result is well formed. The live proof demonstrates the full lifecycle from credit creation through evidence, examination, challenge, adjudication, settlement readiness, and contract-accounting settlement. Reviewers can verify the exact source SHA, 33-method schema, deployment transaction, evidence hash and byte length, 16-write transaction sequence, adjudication fingerprint, reason code, fee profile, and final state from the repository artifacts and the Proof & Audit UI.

## 2–3 minute demo script

1. Start with the problem: a vague documentary discrepancy should not become an arbitrary payment block.
2. Open the landing page and point out the semantic boundary: GenLayer answers only discrepancy support.
3. Open the live Proof & Audit route for Case B and show contract address, Studio-dev/61997, source SHA, and 33-method schema.
4. Show evidence identity: authority, document ID, version, exact 333-byte length, SHA-256, and the transport URI.
5. Walk through the requirement matrix and challenge surface. Highlight the frozen evidence/presentation binding and adjudication fingerprint.
6. Show the finalized result `INVALID_DISCREPANCY / REQUIRED_CONTENT_PRESENT / AVAILABLE`, one adjudication attempt, and zero result shopping.
7. Open Settlement and explain `SETTLED · BENEFICIARY PAID` or `REFUNDED · APPLICANT PAID`, exact exit amount, recipient, and remaining escrow.
8. Finish on Proof & Audit: v1.1 payout/refund transaction proofs, historical deployment labeling, and controlled-vs-live proof labels.

## Reviewer verification checklist

- Confirm the repository root and release HEAD.
- Hash `contracts/clearlc.py` and compare with the stated SHA.
- Compare deployment #4 tx, contract address, chain, and source-parity artifact.
- Fetch the public evidence URL anonymously; verify HTTP 200, 333 bytes, and SHA-256.
- Inspect the 16-write qualification journal; confirm every receipt is finalized and successful.
- Confirm adjudication count 1 and result-shopping count 0.
- Confirm the semantic result and reason code from canonical readback.
- Confirm settlement is contract accounting only; no recipient-transfer claim.
- Run contract, security, frontend, and fixture browser gates.

## Screenshot shot-list

1. Landing hero and semantic boundary.
2. Live Trade Desk with canonical Case B row.
3. Credit Workspace lifecycle timeline.
4. Requirements Matrix with evidence and resolution.
5. Evidence identity card with hash/bytes/authority.
6. Challenge and adjudication result.
7. Settlement accounting state.
8. Proof & Audit provenance panel.
9. Mobile navigation and responsive Proof & Audit.

## Known limitations

The release has a verified production frontend and public repository. Actor separation was not proven live because the qualification used the configured synthetic actor. Studio-dev rate limits can require a bounded retry; a failed canonical read is surfaced and never replaced with fixture state. Accessibility remains PARTIAL. The Portal submission is not claimed until its final authenticated action is confirmed.
