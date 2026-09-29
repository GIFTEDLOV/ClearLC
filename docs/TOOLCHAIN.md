# ClearLC toolchain

## Coherent release family

ClearLC targets the GenLayer v0.6 release-candidate family documented by GenLayer:

| Component | Pinned version / assumption |
|---|---|
| GenLayer CLI | `0.40.0-rc.3` (global CLI already present) |
| `genlayer-js` | `2.0.0-rc.1` (frontend dependency) |
| `genlayer-py` | `0.19.0rc2` (project `.venv`) |
| `genlayer-test` / `gltest` | `0.30.0rc2` (project `.venv`) |
| `genvm-linter` | `0.11.1rc2` (project `.venv`) |
| GenVM contract runner | `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` |
| Node / npm / pnpm | Node `v24.14.0`, npm `11.9.0`, pnpm `11.0.9` |

The RC packages are pinned explicitly. No floating `latest` RC dependency is used.

Studio-dev hosted schema generation and deploy simulation rejected the prior
`1jb45...` runner with `invalid_contract runner malformed`. The exact `5jyc...`
runner was then proven with the correct 5jyc contract namespace and is the
frozen ClearLC candidate for the next deployment authorization. The failed
1jb deployment remains preserved as historical provenance.

## Split local release gates

The 5jyc/rc5 contract surface requires two local linter versions with separate
responsibilities:

- Static AST policy: isolated `genvm-linter==0.11.0`, command
  `genvm-lint lint contracts/clearlc.py`.
- Semantic runner/runtime validation: isolated
  `genvm-linter==0.11.1rc2` with `GENVM_VERSION=v0.6.0-rc5`, commands
  `genvm-lint setup --contract contracts/clearlc.py` and
  `genvm-lint validate contracts/clearlc.py`.
- Hosted authoritative validation: Studio-dev
  `gen_getContractSchemaForCode` followed by read-only `gen_call` with
  `type=deploy`.

`genvm-linter==0.11.1rc2`'s AST checker has a known false positive for the
hosted-proven `@gl.storage.allow` 5jyc API (it reports that the storage classes
need the obsolete `@allow_storage` form). The contract must not be changed to
appease that diagnostic. The 0.11.0 AST gate covers static policy, while the
0.11.1rc2/rc5 setup and validation gates cover exact runner resolution and
semantic validity. Old local typing stubs may likewise report `Annotated` as
non-callable; that is classified as a local stub compatibility limitation when
the hosted and rc5 semantic gates pass.

## 5jyc transaction clock compatibility

Deployment #2 proved the `5jyc...` runner and exact ClearLC source parity, but
the first read-only `create_credit` simulation exposed that hosted 5jyc does
not provide the legacy `gl.message_raw` module attribute. ClearLC therefore
uses `int(datetime.now(timezone.utc).timestamp())` in `_now()`. Hosted probes
proved this deterministic transaction-clock surface, and the replacement
preserves Unix-second deadline comparisons. `open_cure` remains state-gated;
the protocol defines no separate temporal cure window.

Deployment #3 then exposed a separate live semantic API incompatibility before
any adjudication write: the hosted 5jyc runtime has
`gl.vm.run_nondet_default` but not `gl.vm.run_nondet_unsafe`. The deployed
candidate therefore remains a valid 33-method deployment, while live Case B
qualification is blocked at the read-only adjudication fee simulation. This
requires a separately authorized source correction and deployment; it is not
resolved by result shopping or by bypassing semantic adjudication.

## 5jyc nondeterminism compatibility

The exact rc5 `py-lib-genlayer-std` artifact defines
`gl.vm.run_nondet_default(leader_fn, validator_fn, /, *, compare_user_errors=..., compare_vm_errors=..., custom_runners=None, catch_vm_error=False)`.
It returns a lazy result whose evaluated value is a `gl.vm.Return`,
`gl.vm.UserError`, or `gl.vm.VMError`; the validator receives that result
wrapper and must return a boolean. `run_nondet_unsafe` is absent from the
5jyc artifact. ClearLC's validator already requires `gl.vm.Return`, strictly
validates the returned decision payload, independently recomputes the leader
result, and compares all decision-bearing fields before state mutation, so the
minimal source remediation is the direct `run_nondet_default` call.

Read-only hosted probes established the basic result-wrapper and authenticated
evidence-shaped leader path, and the exact source passes Studio-dev schema and
deploy simulation. A deploy simulation executes the constructor/leader path;
it does not create a consensus round or invoke the validator callback. A
validator-disagreement or full validator-round hosted proof therefore requires
an authorized deployed candidate and is not claimed by this local remediation.

The 0.11.0 static checker also reports the pre-existing policy diagnostic that
`gl.nondet.web.get` and `gl.nondet.exec_prompt` are not reachable from an
equivalence-principle block. This is a tooling compatibility limitation for
the hosted-proven 5jyc nondeterminism surface; it is recorded rather than
changing ClearLC's semantic or evidence logic. The authoritative semantic
gate remains 0.11.1rc2 setup/validate with `GENVM_VERSION=v0.6.0-rc5`, plus
the hosted schema and deploy-simulation gates.

## Target network

The intended RC validation target is **Studio development preview**, not Studionet:

- RPC: `https://studio-dev.genlayer.com/api`
- chain ID: `61997`
- CLI alias: `studio-dev`
- currency: `GEN`

Studionet is a different environment with chain ID `61999`; it must not be relabelled or reused for Studio-dev.

## Local constraints

- Docker is installed (`29.4.3`) but its Linux daemon is not running.
- Direct mode tests do not need Docker and are the first-pass test path.
- No deployment, wallet funding, live write, or remote push is part of this phase.
- Docker is not required for hosted Studio-dev; it is only needed for local
  Studio/Localnet paths.

## Official references

- [Consensus v0.6 migration](https://docs.genlayer.com/developers/consensus-v06-migration)
- [Networks](https://docs.genlayer.com/developers/networks)
- [Network configuration](https://docs.genlayer.com/developers/intelligent-contracts/deploying/network-configuration)
- [Equivalence Principle](https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle)
- [Value transfers](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
