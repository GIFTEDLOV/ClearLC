# ClearLC

ClearLC is a documentary trade-settlement protocol that prevents arbitrary payment blocking through vague documentary discrepancy claims.

It freezes credit terms, requirement rules, authenticated evidence, presentation version, and discrepancy identity. Objective facts and settlement consequences remain deterministic. GenLayer is used only for a bounded semantic question: whether an asserted discrepancy is materially supported by the frozen documentary record.

## Verified live release

- Network: Studio-dev, chain ID `61997`
- Contract: `0x4771F6Ced792e786409046f26b1A1cEA905fC0d8`
- Deployment #4: `0xab478da1c57489e36f89ac9fdff56e9db1ad18f84434a7faf137838447f1259d`
- Contract source SHA-256: `f6492afe3b9ab5913bb7a44e8420a916a91558787212ac27c93d382456e61384`
- Runner: `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`
- Schema: 33 public methods
- Live Case B: `CLC-LIVE-CB-1790698367`
- Live result: `INVALID_DISCREPANCY / REQUIRED_CONTENT_PRESENT`
- Live settlement: settled in ClearLC contract accounting; booked amount `250000`
- Fee profile: 16/16 methods, SHA-256 `1686ebcd41d24525bb008cca4f8232de204eff4bedca63dd4d329bd5b32ae3bd`

The evidence publication is synthetic and public for qualification only: [Case B evidence](https://clearlc-case-b-evidence-dxx9m3o2v.vercel.app/case-b-evidence.txt). It is 333 bytes and is identified by SHA-256 `9ca476ade6c465175ec03e7d1e8361ddd7243367a432943962eb9c6699e44371`.

- Live app: https://clearlc.vercel.app
- Public repository: https://github.com/GIFTEDLOV/ClearLC
- Production routing uses a Vercel SPA fallback for clean React Router URLs.

The Portal submission remains a separate final publication action. Outgoing beneficiary GEN transfer remains disabled.

## Protocol boundary

ClearLC separates deterministic settlement from bounded semantics:

1. Freeze credit terms and the active requirement version.
2. Bind evidence to document identity, authority, version, exact byte length, SHA-256, credit, and presentation.
3. Record objective requirement checks and any formal discrepancy.
4. Challenge the discrepancy and freeze the adjudication fingerprint.
5. Ask GenLayer only the bounded semantic question.
6. Apply deterministic contract gates and settlement accounting.

The contract does not let consensus choose the amount, recipient, deadline, authorization, or settlement direction. Outgoing beneficiary transfer is disabled in this release.

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

- The release audit retains three Medium findings and one Low finding; accessibility is PARTIAL.
- Actor separation was not proven live because qualification used the configured synthetic actor.
- Studio-dev RPC rate limits can require bounded retries; live read failures surface explicitly and never fall back to fixtures.
- The 0.11.0 AST linter has a documented valid-5jyc false positive.
- Settlement is booked in ClearLC contract accounting; no beneficiary GEN transfer is claimed.
