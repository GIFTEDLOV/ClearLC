# ClearLC evidence model

Evidence identity is not a URL. Each immutable record binds:

`evidence_id + document_id + credit_id + presentation_id + credit_version + document_type + issuer_identity + subject_identity + source_uri + SHA-256 + exact byte_length + issued_at + submitted_at + authority_identifier + document version`

Controls:

- SHA-256 is exactly 64 lowercase hexadecimal characters.
- Byte length is positive, explicit, and bounded at 10,000,000 bytes.
- IDs and UTF-8 strings are bounded.
- `https://` and `ipfs://` transport hints reject whitespace, controls,
  credentials, query strings, and fragments. The hint is never identity.
- Evidence is bound to one credit, active version, presentation, requirement
  document type, and authority metadata. Document IDs cannot cross credits.
- `submitted_at` cannot precede `issued_at`, exceed the presentation deadline,
  or be in the future. `issued_at` cannot exceed the shipment deadline.
- A replacement creates a new evidence ID/document ID and strictly higher
  document version. No record is overwritten.

The presentation evidence-set fingerprint is computed by the contract from the
canonical evidence ID, document ID, SHA-256, byte length, and document version
rows. A caller-provided hash must equal that derived value.

Deterministic examination records separate `EVIDENCE_UNAVAILABLE`,
`HASH_MISMATCH`, `BYTE_LENGTH_MISMATCH`, `UNAUTHORIZED_ISSUER`,
`MALFORMED_DOCUMENT`, `STALE_DOCUMENT`, and `OBJECTIVE_FAILURE`. Retrieval or
integrity failure becomes `INCONCLUSIVE`, never `VALID_DISCREPANCY`.
