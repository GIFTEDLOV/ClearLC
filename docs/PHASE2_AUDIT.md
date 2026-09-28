# Phase 2 audit record

This audit was performed against commit
`bc6ff5600c46562f430b2ccd6ef0c2164b074179` before changing the ClearLC
contract. An unrelated scaffold was copied into the Phase 1 commit and caused
the aggregate test failure; it has been removed from the ClearLC working tree.
`pyproject.toml` correctly limits discovery to `tests/`.

## Findings before fixes

| Severity | Finding | Affected surface |
| --- | --- | --- |
| HIGH | Settlement readiness was derived from raw examiner check status and `presentation.status`, so a semantically invalid discrepancy or an authorized waiver could not become settlement-eligible, while `REVIEW_REQUIRED` was unnecessarily admitted as a readiness path. | `finalize_examination`, `adjudicate_discrepancy`, `waive_discrepancy`, `mark_settlement_ready` |
| HIGH | Cure opened a discrepancy but did not bind the replacement presentation to that discrepancy. Clean finalization could mark every open cure discrepancy as cured. | `open_cure`, `submit_presentation`, `finalize_examination` |
| HIGH | The presentation evidence-set hash was caller supplied and never derived from the immutable evidence records. Discrepancy document IDs were also accepted as an unchecked CSV. | `submit_presentation`, `file_discrepancy`, semantic input |
| HIGH | The adjudication fingerprint omitted presentation identity, allowing distinct presentations with otherwise matching fields to share a tuple. | `challenge_discrepancy` |
| HIGH | Requirement checks did not bind satisfied/semantic evidence to the requirement document type, active credit version, and exact presentation evidence record. | `record_requirement_check` |
| HIGH | Discrepancy filing did not verify requirement version or that every referenced evidence ID belonged to the bound presentation and evidence-set identity. | `file_discrepancy` |
| HIGH | Semantic output validation had no output-size bound, accepted arbitrary non-empty evidence-status strings for `INCONCLUSIVE`, and replaced invalid UTF-8 with replacement characters. | `_strict_semantic_payload`, `adjudicate_discrepancy` |
| MEDIUM | Evidence document identity was not globally replay-protected; the same `document_id` could be committed in another credit. | `commit_evidence` |
| MEDIUM | Source URI validation allowed URL credentials, fragments, query strings, and unbounded document bytes. | `_is_source_uri`, `commit_evidence` |
| MEDIUM | The contract exposed objective check status but not a canonical per-requirement settlement resolution, making the frontend matrix unable to reconstruct the true gate. | read model and storage |
| LOW | The contract and frontend still identified the release as Phase 1 even though the hardened lifecycle would be Phase 2. | provenance/read models |

## Write-method authorization/state audit

Every current write had a caller check, but the audit found binding gaps in
the methods noted above.

| Method group | Authorized actor | Main precondition reviewed |
| --- | --- | --- |
| create/fund/accept/freeze | applicant, applicant, beneficiary, applicant | actor binding, funding value, monotonic lifecycle |
| define/root/amend/accept amendment | applicant, applicant, applicant, beneficiary | active version and immutable snapshots |
| evidence/presentation | beneficiary | active version, deadlines, replay IDs, evidence lineage |
| examination/check/discrepancy/finalize | examiner | current presentation, formal checks, discrepancy binding |
| challenge/adjudicate | beneficiary, examiner | semantic-only challenge and frozen fingerprint |
| waive/cure | applicant, beneficiary | discrepancy ownership and explicit resolution |
| ready/settle/expire/cancel | examiner, examiner, any caller, applicant | deterministic gate, expiry, terminal behavior |

## Phase 2 closure

Critical/High findings are required to be fixed in the contract and covered by
the aggregate ClearLC test suite. Medium findings that affect identity or
transport safety are also fixed. Remaining limitations are recorded in the
final Phase 2 report rather than hidden behind test selection.

All listed findings were fixed: canonical evidence-set derivation, requirement
resolution rows, cure-to-presentation binding, presentation-aware adjudication
fingerprints, strict semantic output bounds/statuses/UTF-8 handling, document
identity replay protection, URI hardening, deterministic waiver/settlement
eligibility, and historical version readback are now implemented.
