# ClearLC frontend

The reviewer-facing React + TypeScript + Vite application for ClearLC. The
development server uses port `3001`.

## Modes

- `DEMO` (default): deterministic Nigerian cocoa fixtures for the clean,
  invalid-refusal, and material-discrepancy/cure workflows. The UI labels all
  fixture-derived state as `DEMO FIXTURE`.
- `LIVE`: canonical Studio-dev reads and prepared writes through the ClearLC
  adapter. Set `VITE_CLEARLC_CONTRACT_ADDRESS` before enabling it. Without a
  configured address, live mode stays empty and never falls back to fixtures.

## Routes

The application implements the landing page, Trade Desk, credit creation and
workspace, requirements matrix, presentation, examination, challenge,
settlement, Proof & Audit, and integration notes routes.

## Verification

```text
pnpm test
pnpm typecheck
pnpm build
pnpm e2e
```

The transaction journal persists the exact broadcast hash and is designed to
reconcile that same hash after a browser refresh. Outgoing GEN settlement
transfers remain disabled until separately qualified.
