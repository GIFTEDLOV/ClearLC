# ClearLC architecture

ClearLC is a documentary-credit state machine with one deliberately narrow
nondeterministic boundary:

`deterministic credit state -> frozen requirements -> authenticated evidence -> deterministic examination -> structured discrepancy -> bounded GenLayer semantic adjudication -> strict validation -> deterministic business consequence -> canonical readback`

The real contract in `contracts/clearlc.py` stores versioned credit snapshots,
immutable requirements, evidence commitments, historical presentations,
canonical requirement resolutions, formal discrepancies, semantic
adjudications, and an append-only audit stream.

Consensus never chooses amount, recipient, address, deadline, authorization,
evidence identity, state-machine legality, or settlement direction. It returns
only a strict five-field semantic result. Deterministic code maps that result
to requirement and credit state.

`fund_credit` is payable and requires exact `gl.message.value == amount`.
Settlement books deterministic amount and beneficiary accounting only;
outgoing GEN release is disabled. Protocol fee deposits are separate from
payable user value and are handled only by the no-broadcast transaction
discipline scaffold.

Frontend reads are contract-shaped JSON normalized through
`frontend/src/domain/contractAdapter.ts`. Demo data is explicitly labelled and
is never presented as live chain state.
