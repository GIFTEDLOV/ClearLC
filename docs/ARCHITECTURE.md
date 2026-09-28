# ClearLC architecture

ClearLC is a documentary-credit state machine with a deliberately narrow nondeterministic boundary:

`deterministic credit state → frozen requirements → authenticated evidence → deterministic examination → structured discrepancy → bounded GenLayer semantic adjudication → strict validation → deterministic business consequence → canonical readback`

The contract is one real GenLayer Intelligent Contract in `contracts/clearlc.py`. It stores versioned credit snapshots, immutable requirement records, immutable evidence commitments, historical presentations, objective checks, formal discrepancies, semantic adjudication records, and an append-only audit stream.

The contract never lets consensus choose amount, recipient, address, deadline, authorization, evidence identity, state-machine legality, or settlement direction. Consensus returns only a strict five-field decision object, and the deterministic path maps that decision to a status.

Value handling is Phase 1 accounting only. `fund_credit` is payable and requires `gl.message.value == amount`; `settle_credit` books the deterministic recipient and amount but does not emit an external GEN transfer. `outgoing_value_release_enabled` is explicitly false until message/value behavior is profiled and tests are green.

Frontend reads are JSON strings with stable field names plus typed identifiers. The frontend labels all local fixture state as `DEMO FIXTURE` and has no pretend live-chain adapter.

