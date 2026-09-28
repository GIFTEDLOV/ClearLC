# ClearLC state machine

## States

`CREATED → FUNDED → ACCEPTED → PRESENTATION_OPEN → PRESENTED → UNDER_EXAMINATION`

From examination:

- `UNDER_EXAMINATION → COMPLIANT → SETTLEMENT_READY → SETTLED`
- `UNDER_EXAMINATION → DISCREPANT`
- `DISCREPANT → CHALLENGED → DISCREPANT | REVIEW_REQUIRED`
- `DISCREPANT → WAIVED → SETTLEMENT_READY` when every discrepancy is resolved
- `DISCREPANT | REVIEW_REQUIRED → CURE_OPEN → PRESENTED`
- a clean cure returns through `UNDER_EXAMINATION → COMPLIANT`
- a valid cure discrepancy remains `DISCREPANT`
- an inconclusive semantic result becomes `REVIEW_REQUIRED`; it is not beneficiary loss

Additional controlled states:

- `AMENDMENT_PENDING` is entered after a material versioned amendment and exits only through beneficiary acceptance to `PRESENTATION_OPEN`.
- `EXPIRED` and `CANCELLED` are terminal alternatives.

## Transition table

| Method | Caller | State before | Preconditions | State after | Replay / terminal behavior |
|---|---|---|---|---|---|
| `create_credit` | applicant == transaction sender | none / new ID | bounded IDs, positive amount, valid deadlines and ruleset hash | `CREATED` | unique credit ID; terminal irrelevant because credit does not exist |
| `fund_credit` | applicant | `CREATED` | payable value exactly equals amount | `FUNDED` | rejects replay, terminal credit rejected |
| `accept_credit` | beneficiary | `FUNDED` | beneficiary accepts current version | `ACCEPTED` | rejects replay, terminal credit rejected |
| `define_requirement` | applicant | `CREATED`, `FUNDED`, `ACCEPTED`, or pending amendment | current version, unique immutable requirement ID | unchanged | unique requirement ID; historical version never mutated |
| `set_requirements_root` | applicant | pre-freeze current version | valid SHA-256 root and empty prior root | unchanged | root cannot be overwritten |
| `freeze_credit` | applicant | `ACCEPTED` | accepted version, requirements root, at least one requirement | `PRESENTATION_OPEN` | rejects replay and terminal credit |
| `propose_amendment` | applicant | active nonterminal pre-settlement state | new version, new frozen terms/root | `AMENDMENT_PENDING` | monotonic version; prior snapshot immutable |
| `accept_amendment` | beneficiary | `AMENDMENT_PENDING` | requirements defined for new version | `PRESENTATION_OPEN` | one acceptance per version |
| `commit_evidence` | beneficiary | `PRESENTATION_OPEN` or `CURE_OPEN` | current version, required document type, unique evidence ID, strict URI/hash/length/timestamps | unchanged | no overwrite; replacement uses a new evidence ID and higher document version |
| `submit_presentation` | beneficiary | `PRESENTATION_OPEN` or `CURE_OPEN` | current credit version, next presentation version, committed evidence, deadline | `PRESENTED` | unique monotonic presentation ID/version |
| `begin_examination` | examiner | `PRESENTED` | current presentation/version, not expired | `UNDER_EXAMINATION` | rejects replay/non-current presentation |
| `record_requirement_check` | examiner | `UNDER_EXAMINATION` | one immutable check per presentation/requirement | unchanged | check key cannot be overwritten |
| `file_discrepancy` | examiner | `UNDER_EXAMINATION` | failed objective check, structured type/reason/evidence-set binding | unchanged until finalization | unique discrepancy ID |
| `finalize_examination` | examiner | `UNDER_EXAMINATION` | all required checks and formal discrepancies recorded | `COMPLIANT` or `DISCREPANT` | one finalization per presentation state |
| `challenge_discrepancy` | beneficiary | `DISCREPANT` or `REVIEW_REQUIRED` | semantic, open discrepancy; derived fingerprint not finalized | `CHALLENGED` | same fingerprint cannot be challenged after finalization |
| `adjudicate_discrepancy` | examiner | `CHALLENGED` | strict consensus result, independent validator reproduction | `DISCREPANT` / `REVIEW_REQUIRED` | first finalized outcome wins for frozen fingerprint |
| `waive_discrepancy` | applicant | `DISCREPANT` or `REVIEW_REQUIRED` | only finalized `VALID_DISCREPANCY` | `WAIVED` | explicit and once-only |
| `open_cure` | beneficiary | `DISCREPANT` or `REVIEW_REQUIRED` | valid or inconclusive discrepancy | `CURE_OPEN` | once per open cure path |
| `mark_settlement_ready` | examiner | `COMPLIANT`, `REVIEW_REQUIRED`, or `WAIVED` | funded, current compliant presentation, no unresolved discrepancy, before expiry | `SETTLEMENT_READY` | rejects replay and expiry |
| `settle_credit` | examiner | `SETTLEMENT_READY` | funded, before expiry, booking amount zero | `SETTLED` | double settlement rejected; no external transfer in Phase 1 |
| `expire_credit` | any caller | any nonterminal | current time strictly greater than expiry | `EXPIRED` | terminal; settlement blocked |
| `cancel_credit` | applicant | `CREATED` | not funded | `CANCELLED` | terminal; replay rejected |

At the expiry boundary, `now == expiry_at` is still eligible for presentation and settlement. `now > expiry_at` is expired.

