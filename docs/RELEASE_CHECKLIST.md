# ClearLC release checklist

## Source and deployment parity

- [x] Contract source is frozen; SHA-256 is `f6492afe3b9ab5913bb7a44e8420a916a91558787212ac27c93d382456e61384`.
- [x] Deployment #4 is finalized and source-parity verified at `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8`.
- [x] Studio-dev / chain 61997 and 5jyc / GenVM rc5 are recorded.
- [x] Live schema has 33 public methods.

## Live qualification

- [x] Evidence response is anonymous HTTP 200, exactly 333 bytes, and SHA-256 verified.
- [x] Case B has 16 finalized successful writes.
- [x] Adjudication was attempted exactly once; result shopping is zero.
- [x] First valid result accepted: `INVALID_DISCREPANCY / REQUIRED_CONTENT_PRESENT`.
- [x] Final canonical state is `SETTLED`; `250000` is booked in contract accounting.
- [x] Fee profile covers 16/16 methods and has a recorded SHA-256.
- [x] Outgoing beneficiary GEN transfer remains disabled and unclaimed.

## Local gates

- [x] Python contract, property, adversarial, and mutation suites.
- [x] GenVM rc5 semantic validation and schema checks.
- [x] Frontend tests, typecheck, and production build.
- [x] DEMO fixture Playwright suite.
- [x] Secret scan and provenance review.
- [ ] Clean live browser smoke after a fresh Studio-dev rate-limit window.

## Publication gate

- [x] README, provenance, independent audit, submission package, and frontend truth audit are present.
- [x] No production frontend URL is fabricated.
- [ ] Final push, production Vercel deployment, and Portal submission require separate authorization.
