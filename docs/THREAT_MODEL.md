# ClearLC threat model

## Trust boundaries

- Applicant, beneficiary, and examiner are authenticated workflow actors. Issuers are represented as committed authority metadata, not V1 workflow actors.
- Document bytes and document text are untrusted. URLs are retrieval hints only.
- The examiner's discrepancy assertion is untrusted structured input, not a unilateral rejection.
- Leader/model output is untrusted until an independent validator evaluates the same frozen inputs.
- Frontend fixture state is untrusted demo data and is never called live protocol state.

## Threats and controls

| Threat | Control |
|---|---|
| Applicant blocks payment by assertion | Only a structured examiner discrepancy can move an examination to `DISCREPANT`; the applicant can only waive a finalized valid discrepancy. |
| Beneficiary forces payment by “close enough” claim | Requirements, evidence identity, deadlines, and presentation version are frozen; semantic consensus is bounded and settlement remains deterministic. |
| URL/mirror changes document identity | Identity binds credit, presentation/version, issuer, exact SHA-256, byte length, timestamps, authority, and evidence version. |
| Evidence overwrite or replay | IDs and check keys are unique; replacements use new IDs and strictly higher document versions. |
| Cross-credit evidence confusion | Every evidence, presentation, requirement, and discrepancy verifies its credit binding. |
| Result shopping | Adjudication fingerprint includes credit version, requirement, evidence-set hash, ruleset hash, and discrepancy ID; first finalized outcome wins. |
| Prompt injection in documents | Prompt data is explicitly marked untrusted; task/schema/IDs are frozen outside the data; strict output keys reject extra control fields. |
| Model selects payment terms | Semantic prompt and schema contain no authoritative payment direction, amount, recipient, address, deadline, or authorization fields. |
| Retrieval failure becomes beneficiary loss | Retrieval, hash, byte-length, and semantic inconclusive statuses are distinct; the semantic result must be `INCONCLUSIVE`. |
| Double settlement | Deterministic gate requires `SETTLEMENT_READY` and zero prior booked amount. |
| Expired settlement | Both readiness and booking enforce the expiry boundary. |
| Terminal regression | All writes use explicit state preconditions and reject terminal credits. |

