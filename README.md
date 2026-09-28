# ClearLC

ClearLC is a GenLayer-native documentary trade settlement protocol. It freezes
the credit, requirements, authenticated evidence identity, presentation
version, governing ruleset, and formal discrepancy before a bounded semantic
question reaches consensus.

Phase 2 remains local-only. No deployment, live write, wallet funding, remote
push, or outgoing GEN transfer is enabled. The frontend is a typed protocol
shell and labels all local fixture state as `DEMO FIXTURE`.

## Layout

- `contracts/clearlc.py` — real GenLayer Intelligent Contract
- `tests/` — isolated ClearLC direct, adversarial, property, and mutation tests
- `fixtures/` — deterministic synthetic cocoa-export documents and ruleset
- `frontend/` — React + TypeScript + Vite route shell on port 3001
- `docs/` — protocol, audit, testing, and release documents
- `artifacts/` — local schema and test artifacts

## Local checks

```powershell
.\\.venv\\Scripts\\pytest.exe -q tests
.\\.venv\\Scripts\\genvm-lint.exe check contracts\\clearlc.py
.\\.venv\\Scripts\\genvm-lint.exe schema contracts\\clearlc.py --json
pnpm --dir frontend typecheck
pnpm --dir frontend build
```

The target network is Studio development preview: RPC
`https://studio-dev.genlayer.com/api`, chain ID `61997`. It is not Studionet.
See [`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md) for the pinned RC family.
