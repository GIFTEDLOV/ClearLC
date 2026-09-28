# CharterLock Protocol — Build Plan

## Completed checkpoint: Phase 0 + Phase 1

- captured the local runtime/toolchain baseline
- selected the cached Studio-dev v0.6 family (`v0.6.0-rc2`)
- froze architecture, threat model, storage layout, and state transitions
- implemented charter creation, authority registration, validation, and freeze
- implemented deterministic case/evidence registration and evidence snapshot
- implemented strict bounds, URL binding, SHA-256 checks, duplicate checks,
  append-only IDs, and canonical read APIs
- added explicit fail-closed adjudication/readjudication boundaries
- added challenge and resolution lineage storage scaffolding
- added direct GenLayer tests and semantic-output test fixtures

## Phase 2 — semantic adjudication (operator review required)

1. Implement authenticated bounded evidence retrieval with typed outcomes for
   404, timeout, malformed response, digest mismatch, and unavailable source.
2. Build the `BINARY_EVENT_V1` prompt from frozen charter fields and the sealed
   evidence root; treat evidence bytes as untrusted data.
3. Validate the exact bounded semantic result: eight keys, fixed types,
   enumerations, size, and cross-field consistency.
4. Use GenLayer consensus with custom semantic equivalence over stable fields;
   validators independently evaluate admissible evidence.
5. Persist only the bounded semantic result and deterministic consequence, not
   arbitrary model prose.
6. Complete challenge generation and finalization with preserved lineage.

## Phase 3 — verification and frontend (operator review required)

- add 30+ direct, 20+ adversarial, 8+ state-machine/invariant tests and
  mutation targets
- exercise local simulator and, separately, a reviewer-approved Studio-dev
  integration using transaction discipline
- build the React/TypeScript routes only after canonical contract reads/writes
  exist
- add proof/provenance readback, source/config parity, and release checks

## Phase 4 — release (explicit authorization required)

Freeze source SHA-256, exact Git HEAD, network/chain ID, runner/toolchain,
deployment hash/address, schema, deployed-source parity, CI, clean worktree,
secret scan, frontend configuration, and proof package. No deployment or live
write is part of this checkpoint.

