# ClearLC evidence model

Evidence is an immutable commitment, not a URL. The committed identity is:

`evidence_id + document_id + credit_id + presentation_id + credit_version + document_type + issuer_identity + subject_identity + source_uri + SHA-256 + exact byte_length + issued_at + submitted_at + authority_identifier + document version`

Validation rules:

- SHA-256 is exactly 64 lowercase hexadecimal characters.
- Byte length is explicit and positive.
- IDs and UTF-8 strings are bounded.
- Transport hints accept only bounded `https://` or `ipfs://` forms with no whitespace/control characters.
- `submitted_at` cannot be in the future, cannot exceed the presentation deadline, and cannot precede `issued_at`.
- `issued_at` cannot exceed the shipment deadline.
- Evidence document type must match a frozen requirement in the active credit version.
- Evidence is bound to exactly one credit and presentation. Reuse across credits is rejected.
- A replacement is a new evidence ID and a higher document version; no record is silently overwritten.

The examiner's deterministic check records separate statuses: `EVIDENCE_UNAVAILABLE`, `HASH_MISMATCH`, `BYTE_LENGTH_MISMATCH`, `UNAUTHORIZED_ISSUER`, `MALFORMED_DOCUMENT`, `STALE_DOCUMENT`, and `OBJECTIVE_FAILURE`. None is silently converted to `VALID_DISCREPANCY`.

GenLayer web retrieval is performed only inside the nondeterministic leader/validator functions. The retrieved bytes are checked against the committed hash and length before any semantic question is posed. A retrieval or integrity failure yields an inconclusive bounded outcome and is not an adverse payment decision.

