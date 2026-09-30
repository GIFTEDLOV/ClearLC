# ClearLC release provenance

## Release candidate

- Release candidate HEAD: `b5eec052755ba73269c5112658acc1258b17375b`
- Contract source: `contracts/clearlc.py`
- Contract SHA-256: `f6492afe3b9ab5913bb7a44e8420a916a91558787212ac27c93d382456e61384`
- Public schema: 33 methods
- Runner: `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`
- GenVM: `v0.6.0-rc5`
- Network: Studio-dev, chain ID `61997`
- RPC: `https://studio-dev.genlayer.com/api`

## Deployment #4 — current live proof

- Transaction: `0xab478da1c57489e36f89ac9fdff56e9db1ad18f84434a7faf137838447f1259d`
- Contract: `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8`
- Status: `FINALIZED / FINISHED_WITH_RETURN`
- Source parity: exact deployed source SHA matches the release source SHA.
- Contract identity: `contract_info` verified as ClearLC.

## Live Case B

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
- Live Studio-dev proof: deployment #4, the 16-write Case B journal, finalized receipts, canonical readback, and the fee profile.

## Historical deployments

- Deployment #1 failed with `invalid_contract runner malformed` under the rejected 1jb runner.
- Deployment #2 finalized successfully but exposed the `gl.message_raw` clock incompatibility.
- Deployment #3 finalized successfully, fixed `_now()`, and recorded a 13-write partial Case B blocked by the obsolete nondeterminism API.
- Deployment #4 is the current source-parity-verified and fully qualified deployment.

## Known limitations

- The deployer occupied multiple synthetic roles during qualification; actor separation is not proven live.
- Outgoing beneficiary GEN transfer is disabled and untested by policy.
- No production frontend URL, GitHub URL, or Portal submission is claimed yet.
- The 0.11.0 AST linter has a documented 5jyc nondeterminism false positive; semantic rc5 validation and hosted proof are authoritative for that construct.
