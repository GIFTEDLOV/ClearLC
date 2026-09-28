# CharterLock Protocol

CharterLock is GenLayer-native semantic adjudication infrastructure. Its first
schema is `BINARY_EVENT_V1`, demonstrated with real-world event resolution
without implementing betting, custody, odds, trading, liquidity, or tokens.

Phase 0/1 is intentionally local-only. No deployment, live write, wallet
funding, remote push, or frontend implementation is part of this checkpoint.

See `ARCHITECTURE_LOCK.md`, `THREAT_MODEL.md`, and `BUILD_PLAN.md`.

# Preserved ClearLC Scaffold

The pre-existing ClearLC scaffold in this workspace is preserved as an
unrelated untracked artifact. CharterLock is defined by
`contracts\\charter_lock.py` and the architecture-lock documents.

ClearLC is a GenLayer-native documentary trade settlement protocol. It freezes the credit, requirements, authenticated evidence identity, presentation version, governing ruleset, and formal discrepancy before a bounded semantic question reaches consensus.

Phase 0/1 is intentionally local-only. No deployment, live write, wallet funding, or remote push is part of this checkpoint.

## Local commands

```powershell
$env:GENVM_VERSION = "v0.6.0-rc2"
C:\Users\DELL\.beacon-v8-v06-rc2\Scripts\python.exe -m pytest tests
C:\Users\DELL\.beacon-v8-v06-rc2\Scripts\genvm-lint.exe lint contracts\charter_lock.py
```

The frontend is a typed shell only. Any fixture data is labelled `DEMO FIXTURE`; it is not presented as live chain state.
