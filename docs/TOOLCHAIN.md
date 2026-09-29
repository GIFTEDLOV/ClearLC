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
