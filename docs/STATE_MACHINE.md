# ClearLC state machine

## Credit states

`CREATED -> FUNDED -> ACCEPTED -> PRESENTATION_OPEN -> PRESENTED -> UNDER_EXAMINATION`

Examination resolves to `COMPLIANT` or `DISCREPANT`. A semantic challenge
enters `CHALLENGED`; its bounded result becomes `COMPLIANT` for
`INVALID_DISCREPANCY`, `DISCREPANT` for `VALID_DISCREPANCY`, and
`REVIEW_REQUIRED` for `INCONCLUSIVE`. A valid or inconclusive discrepancy, or
an objective discrepancy, may enter `CURE_OPEN` and only its bound replacement
presentation may return the credit to examination. A finalized valid
discrepancy may become `WAIVED`; waiver does not rewrite its adjudication.

Settlement requires `COMPLIANT` or fully resolved `WAIVED`, then
`SETTLEMENT_READY -> SETTLED`. `EXPIRED` and `CANCELLED` are terminal.
`AMENDMENT_PENDING` is a versioned branch that returns to `PRESENTATION_OPEN`
only after beneficiary acceptance.

## Requirement resolutions

Each required row is reconstructed by `get_requirement_matrix` and has one
canonical resolution: `UNASSESSED`, `OBJECTIVELY_SATISFIED`, `OBJECTIVE_FAILURE`,
`DISCREPANCY_ASSERTED`, `CHALLENGED`, `VALID_DISCREPANCY`,
`INVALID_DISCREPANCY`, `WAIVED`, `INCONCLUSIVE`, `CURE_OPEN`, or `CURED`.

Only `OBJECTIVELY_SATISFIED`, `INVALID_DISCREPANCY`, `WAIVED`, and `CURED` are
settlement-compatible. The caller cannot supply a compliance boolean.

## Transition table

| Method | Caller | State before | Preconditions / binding | Result and replay behavior |
| --- | --- | --- | --- | --- |
| `create_credit` | applicant | none | unique bounded ID, positive amount, ordered deadlines, ruleset hash | `CREATED`; duplicate ID rejected |
| `fund_credit` | applicant | `CREATED` | payable `gl.message.value == amount` exactly | `FUNDED`; zero, under, over, replay rejected |
| `accept_credit` | beneficiary | `FUNDED` | active version | `ACCEPTED`; replay rejected |
| `define_requirement` / `set_requirements_root` | applicant | pre-freeze active version | unique requirement/root and immutable version snapshot | no state change; replay or stale version rejected |
| `freeze_credit` | applicant | `ACCEPTED` | beneficiary accepted, root and requirements exist | `PRESENTATION_OPEN`; terminal/replay rejected |
| `propose_amendment` | applicant | accepted/open/review/cure | monotonic new version and ordered deadlines | `AMENDMENT_PENDING`; prior version untouched |
| `accept_amendment` | beneficiary | `AMENDMENT_PENDING` | new version has requirements | `PRESENTATION_OPEN`; replay rejected |
| `commit_evidence` | beneficiary | `PRESENTATION_OPEN` / `CURE_OPEN` | active version, required type, unique evidence/document identity, exact hash/length/timestamps | immutable evidence row; replacements use new ID and higher version |
| `submit_presentation` | beneficiary | `PRESENTATION_OPEN` / `CURE_OPEN` | monotonic version, canonical evidence-set hash, deadline; cure ID must match active cure | `PRESENTED`; duplicate/stale/cross-credit rejected |
| `begin_examination` | examiner | `PRESENTED` | current presentation/version and not expired | `UNDER_EXAMINATION`; replay/stale rejected |
| `record_requirement_check` | examiner | `UNDER_EXAMINATION` | one check, requirement/evidence/presentation/version binding | immutable check row; replay rejected |
| `file_discrepancy` | examiner | `UNDER_EXAMINATION` | failed check, exact presentation evidence binding, structured reason/type | open discrepancy; duplicate/cross-credit rejected |
| `finalize_examination` | examiner | `UNDER_EXAMINATION` | all required checks and formal discrepancies | `COMPLIANT` or `DISCREPANT`; one finalization |
| `challenge_discrepancy` | beneficiary | `DISCREPANT` / `REVIEW_REQUIRED` | semantic open discrepancy; fingerprint includes presentation | `CHALLENGED`; finalized tuple cannot re-challenge |
| `adjudicate_discrepancy` | examiner | `CHALLENGED` | strict result and independent validator substance check | first immutable result wins; no rerun |
| `waive_discrepancy` | applicant | `DISCREPANT` / `REVIEW_REQUIRED` | only finalized `VALID_DISCREPANCY`, exact discrepancy binding | `WAIVED` if all current rows resolve; judgment unchanged |
| `open_cure` | beneficiary | `DISCREPANT` / `REVIEW_REQUIRED` | one cure bound to objective/valid/inconclusive discrepancy | `CURE_OPEN`; one active cure at a time |
| `mark_settlement_ready` | examiner | `COMPLIANT` / resolved `WAIVED` | funded, current presentation, every required row eligible, no unresolved discrepancy, before expiry | `SETTLEMENT_READY`; REVIEW/CHALLENGED/OPEN rejected |
| `settle_credit` | examiner | `SETTLEMENT_READY` | exact deterministic escrow, zero booked amount, before expiry | `SETTLED`; terminal and double booking rejected |
| `expire_credit` | any caller | any nonterminal | `now > expiry_at` | `EXPIRED`; terminal/replay rejected |
| `cancel_credit` | applicant | `CREATED` | unfunded | `CANCELLED`; terminal/replay rejected |

At `now == deadline`, the deadline is still eligible. At `now > deadline`, the
relevant operation is rejected. Evidence `issued_at <= shipment_deadline` and
`submitted_at <= presentation_deadline`; both must not be in the future.
