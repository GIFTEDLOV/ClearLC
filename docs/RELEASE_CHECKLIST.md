# ClearLC release checklist

## Source and deployment parity

- [x] v1.1.0 contract source is frozen; SHA-256 is `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`.
- [x] Historical v1.0.1 deployment #4 is preserved at `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8` and labeled pre-cash-exit.
- [x] v1.1.0 deployment is finalized and source-parity verified at `0x49Eba6C84256b81d8aEeED7A15f677f1A7A2C3e6`.
- [x] Studio-dev / chain 61997 and 5jyc / GenVM rc5 are recorded.
- [x] Live schema has 34 public methods.

## Live qualification

- [x] Evidence response is anonymous HTTP 200, exactly 333 bytes, and SHA-256 verified.
- [x] v1.1 payout case has 13 finalized successful writes and an exact `1000000` beneficiary balance delta.
- [x] v1.1 funded-expiry refund case has 3 finalized successful writes and an exact `1000000` applicant balance delta.
- [x] Payout/refund are mutually exclusive, replay-protected, and liability returns to zero.
- [x] Outgoing native GEN release is enabled and live-qualified.

## Local gates

- [x] Python contract, property, adversarial, and mutation suites.
- [x] GenVM rc5 semantic validation and schema checks.
- [x] Frontend tests, typecheck, and production build.
- [x] DEMO fixture Playwright suite.
- [x] Secret scan and provenance review.
- [x] Clean production live browser smoke on desktop, tablet, and mobile after a fresh Studio-dev rate-limit window.

## Publication gate

- [x] README, provenance, independent audit, submission package, and frontend truth audit are present.
- [x] Production frontend URL is verified: https://clearlc.vercel.app.
- [x] Public GitHub repository is verified: https://github.com/GIFTEDLOV/ClearLC.
- [ ] Portal submission requires the final authenticated action.
