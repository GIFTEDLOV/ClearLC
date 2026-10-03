# ClearLC release provenance

## v1.1.0 release candidate

- Release candidate HEAD before publication metadata: `2660e68ad0bd19acb263df3f8b59d77f9853be3e`
- Contract source: `contracts/clearlc.py`
- Contract SHA-256: `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`
- Public schema: 34 methods
- Runner: `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`
- GenVM: `v0.6.0-rc5`
- Network: Studio-dev, chain ID `61997`
- RPC: `https://studio-dev.genlayer.com/api`
- Production app: `https://clearlc.vercel.app`
- Public repository: `https://github.com/GIFTEDLOV/ClearLC`

## Deployment #4 — current live proof

- Transaction: `0xab478da1c57489e36f89ac9fdff56e9db1ad18f84434a7faf137838447f1259d`
- Contract: `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8`
- Label: **HISTORICAL / PRE-CASH-EXIT RELEASE**
- Status: `FINALIZED / FINISHED_WITH_RETURN`
- Source parity: exact deployed source SHA matches the release source SHA.
- Contract identity: `contract_info` verified as ClearLC.

## v1.1.0 deployment and live cash proofs

- Deployment transaction: `0x469acc28f2be83ee1a4b922cb74e47b0d4822feb68e8da42f7a2f9736598a57f`
- Contract: `0x49Eba6C84256b81d8aEeED7A15f677f1A7A2C3e6`
- Status: `FINALIZED / FINISHED_WITH_RETURN`
- Source parity: exact SHA-256 match
- Protocol version: `1.1.0`
- Outgoing value release: enabled
- Beneficiary payout: `CLC-V110-PAYOUT-1791047316713`, `SETTLED / BENEFICIARY_PAYOUT`, amount `1000000`, tx `0xcfc404d73ff8742d898c5f0568eb3f10490bd498c5fb5384f5c9abc62eb34d89`
- Applicant refund: `CLC-V110-REFUND-1791047316714`, `REFUNDED / APPLICANT_REFUND`, amount `1000000`, tx `0x35bf6eed60e38bf321af2f9cb313db5d25c29208e18c75c653e52a9565b40deb`
- Qualification: 9 direct cash tests, 45 full regression, 19/19 cash mutants killed, 30/30 Playwright, audit 0 Critical / 0 High / 0 Medium / 0 Low

## Historical v1.0 Case B

- Credit: `CLC-LIVE-CB-1790698367`
- Writes: 16 finalized writes; every hash was persisted before polling and reconciled by the same hash.
- Adjudication transaction: `0x7199057cd1e38e2512b202b2b3c534ca4df63a01a9d32b307143004c5830ca93`
- Adjudication attempts: 1
- Result-shopping attempts: 0
- Evidence fingerprint: `fe2bb269d81c7fff13bb5df35b56c2cccb3bfe1328aedd735c3ac49e4946c9e3`
- Adjudication fingerprint: `7860f582d3a854ebc781ed71ee0f087b19408736660f89562b4562c1679ef2ad`
- Decision: `INVALID_DISCREPANCY`
- Reason: `REQUIRED_CONTENT_PRESENT`
- Evidence status: `AVAILABLE`
- Final state: `SETTLED`
- Settlement proof: `settlement_booked_amount = 250000` in ClearLC contract accounting. No beneficiary GEN transfer is claimed.

## Evidence identity

- URL: `https://clearlc-case-b-evidence-dxx9m3o2v.vercel.app/case-b-evidence.txt`
- Anonymous HTTP status: 200
- Exact byte length: 333
- SHA-256: `9ca476ade6c465175ec03e7d1e8361ddd7243367a432943962eb9c6699e44371`
- Identity binds document metadata, authority, credit/presentation context, version, byte length, and SHA-256. The URI is transport only.

## Fee profile

- Artifact: `artifacts/clearlc-fee-profile.json`
- Coverage: 16/16 required methods
- SHA-256: `1686ebcd41d24525bb008cca4f8232de204eff4bedca63dd4d329bd5b32ae3bd`
- Profile resource requirements and volatile Studio-dev quotes remain separate in the artifact.

## Proof separation

- Controlled local proof: deterministic fixtures, property tests, adversarial tests, mutation tests, and the fixture Playwright suite.
- Hosted predeployment proof: Studio-dev schema/deploy simulation and 5jyc compatibility probes.
- Live Studio-dev proof: v1.1.0 deployment, controlled payout/refund journals, finalized receipts, canonical readbacks, and preserved historical v1.0 evidence.

## Historical deployments

- Deployment #1 failed with `invalid_contract runner malformed` under the rejected 1jb runner.
- Deployment #2 finalized successfully but exposed the `gl.message_raw` clock incompatibility.
- Deployment #3 finalized successfully, fixed `_now()`, and recorded a 13-write partial Case B blocked by the obsolete nondeterminism API.
- Deployment #4 remains preserved historical evidence and is not the v1.1.0 canonical contract.

## Known limitations

- The deployer occupied multiple synthetic roles during qualification; actor separation is not proven live.
- v1.1.0 native GEN release is enabled and qualified by exact beneficiary payout and applicant refund balance deltas.
- Accessibility audit remains PARTIAL.
- Studio-dev RPC rate limits remain a live operational limitation.
- Portal submission is not claimed until the authenticated final action is confirmed.
- The 0.11.0 AST linter has a documented 5jyc nondeterminism false positive; semantic rc5 validation and hosted proof are authoritative for that construct.
