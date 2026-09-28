# Testing architecture

The first-pass test layout keeps deterministic business logic separate from
the nondeterministic semantic boundary:

- `tests/test_protocol.py` runs the real contract in `gltest` direct mode and
  covers authorization, state transitions, immutable evidence, the settlement
  gate, expiry, and a controlled semantic challenge with validator replay.
- `tests/test_pure_invariants.py` verifies fixture byte lengths, SHA-256
  identities, the frozen ruleset hash, and the title-only hero case.
- `tests/test_adversarial_surface.py` checks the locked public capabilities,
  prompt-injection boundary markers, and the three deterministic fixture cases.
- `tests/test_phase2_protocol.py` covers cure lineage, amendments, waiver
  distinction, payable value, terminal settlement, cross-credit identity, URI
  validation, and malformed semantic output.
- `tests/test_property_invariants.py` executes 16 generated direct state
  sequences (384 workflow operations) plus 64 generated lineage sequences.
- `scripts/run_mutations.py` runs 9 temporary contract mutants; all critical
  mutants must be killed.

Mutation targets are the caller checks, status preconditions, evidence hash and
byte-length checks, version monotonicity, adjudication fingerprint uniqueness,
waiver authorization, settlement booking guard, and expiry boundary.

The focused command is:

```powershell
.\\.venv\\Scripts\\pytest.exe -q tests\\test_protocol.py tests\\test_pure_invariants.py tests\\test_adversarial_surface.py
```

The aggregate `pytest tests` command is the required gate. It must discover
only ClearLC tests and pass without legacy or unrelated failures.
