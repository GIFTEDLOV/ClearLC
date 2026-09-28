# CharterLock frontend boundary

The React/TypeScript frontend is intentionally deferred until Phase 2. It
must read and write canonical CharterLock contract state; it must not invent
live protocol state or bypass the charter/evidence lifecycle.

Reserved route families are documented in `ARCHITECTURE_LOCK.md` and
`BUILD_PLAN.md`.
