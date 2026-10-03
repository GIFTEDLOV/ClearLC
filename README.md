# ClearLC

ClearLC is a documentary trade-settlement protocol that prevents arbitrary payment blocking through vague documentary discrepancy claims.

It freezes credit terms, requirement rules, authenticated evidence, presentation version, and discrepancy identity. Objective facts and settlement consequences remain deterministic. GenLayer is used only for a bounded semantic question: whether an asserted discrepancy is materially supported by the frozen documentary record.

## Verified v1.1.0 live release

ClearLC v1.1.0 fixes the GenLayer steward-identified funded-lifecycle defect: funded native GEN now has exactly one deterministic cash exit. Settlement pays the frozen beneficiary; funded expiry automatically refunds the frozen applicant.

- Network: Studio-dev, chain ID `61997`
- Canonical contract: `0x49Eba6C84256b81d8aEeED7A15f677f1A7A2C3e6`
- Deployment transaction: `0x469acc28f2be83ee1a4b922cb74e47b0d4822feb68e8da42f7a2f9736598a57f`
- Contract source SHA-256: `808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13`
- Protocol version: `1.1.0`
- Runner: `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`
- Schema: 34 public methods
- Outgoing native GEN release: enabled
- Live payout proof: `CLC-V110-PAYOUT-1791047316713`, settlement `0xcfc404d73ff8742d898c5f0568eb3f10490bd498c5fb5384f5c9abc62eb34d89`, exact beneficiary delta `1000000`
- Live refund proof: `CLC-V110-REFUND-1791047316714`, expiry refund `0x35bf6eed60e38bf321af2f9cb313db5d25c29208e18c75c653e52a9565b40deb`, exact applicant delta `1000000`

The evidence publication is synthetic and public for qualification only: [Case B evidence](https://clearlc-case-b-evidence-dxx9m3o2v.vercel.app/case-b-evidence.txt). It is 333 bytes and is identified by SHA-256 `9ca476ade6c465175ec03e7d1e8361ddd7243367a432943962eb9c6699e44371`.

- Live app: https://clearlc.vercel.app
- Public repository: https://github.com/GIFTEDLOV/ClearLC
- Production routing uses a Vercel SPA fallback for clean React Router URLs.

The historical v1.0 deployment remains preserved as **HISTORICAL / PRE-CASH-EXIT RELEASE** at `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8`. It is not the canonical v1.1 contract.

## Protocol boundary

ClearLC separates deterministic settlement from bounded semantics:

1. Freeze credit terms and the active requirement version.
2. Bind evidence to document identity, authority, version, exact byte length, SHA-256, credit, and presentation.
3. Record objective requirement checks and any formal discrepancy.
4. Challenge the discrepancy and freeze the adjudication fingerprint.
5. Ask GenLayer only the bounded semantic question.
6. Apply deterministic contract gates and settlement accounting.

The contract does not let consensus choose the amount, recipient, deadline, authorization, or settlement direction. Native GEN escrow exits exactly once to the beneficiary on deterministic settlement or to the applicant on funded expiry.

## Repository layout

- `contracts/clearlc.py` — deployed GenLayer Intelligent Contract source.
- `tests/` — unit, property, adversarial, and mutation coverage.
- `fixtures/` — synthetic evidence and controlled cases.
- `frontend/` — React, TypeScript, and Vite reviewer application.
- `docs/` — architecture, threat model, release audit, and submission material.
- `artifacts/` — deployment, qualification, provenance, and fee-profile records.

## Local development

```powershell
.\.venv\Scripts\pytest.exe -q tests
pnpm --dir frontend install
pnpm --dir frontend test
pnpm --dir frontend typecheck
pnpm --dir frontend build
pnpm --dir frontend dev
```

The local frontend uses `DEMO` mode by default. To inspect verified Studio-dev reads locally, copy the required values from `frontend/.env.example` into an ignored `frontend/.env.local`, set `VITE_CLEARLC_MODE=LIVE`, and provide the verified contract address and source SHA. Live mode never falls back to fixture state when canonical reads fail.

## Verification material

- [Release provenance](docs/RELEASE_PROVENANCE.md)
- [Independent release audit](docs/RELEASE_AUDIT.md)
- [Submission package](docs/SUBMISSION.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Frontend truth audit](docs/FRONTEND_TRUTH_AUDIT.md)
- [State machine](docs/STATE_MACHINE.md)
- [Semantic adjudication](docs/SEMANTIC_ADJUDICATION.md)
- [Threat model](docs/THREAT_MODEL.md)

Historical deployments are preserved and labelled in the provenance package. They are not interchangeable with the verified deployment #4 proof.

## Known limitations

- Actor separation was not proven live because qualification used the configured synthetic actor.
- Studio-dev RPC rate limits can require bounded retries; live read failures surface explicitly and never fall back to fixtures.
- The 0.11.0 AST linter has a documented valid-5jyc false positive.
- Live cash proofs are qualification evidence on Studio-dev; no new writes are performed by the frontend proof surfaces.
