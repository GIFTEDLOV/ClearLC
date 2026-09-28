# CharterLock Protocol — Threat Model

## Assets

- frozen rule semantics and charter hash
- authority identity and URL binding
- evidence identity, byte length, timestamps, and snapshot root
- case lifecycle legality and challenge-generation limits
- resolution history and provenance lineage
- the distinction between business verdicts and infrastructure failures

## Trust boundaries

1. Callers submit charter fields, authority rules, and evidence metadata.
2. The deterministic contract validates and binds those fields.
3. External transport/evidence collection authenticates source content and
   supplies digest/length metadata. Phase 2 will bind this into the validator
   execution path.
4. GenLayer validators independently evaluate only the bounded semantic
   question from the sealed admissible snapshot.
5. Read clients consume canonical contract state and must not infer state from
   UI guesses or transaction success alone.

## Threats and controls

| Threat | Control |
| --- | --- |
| post-exposure rule change | charter state and charter-critical writes are immutable after freeze |
| arbitrary authority injection | creator-only authority registration; strict class/hostname/path validation; evidence references registered authority IDs |
| URL confusion | HTTPS only, valid normalized hostname, no credentials/fragments/ports/control bytes, bounded path/query, exact path-prefix matching |
| duplicate evidence/challenge inflation | content fingerprint map, duplicate rejection, monotonic IDs, append-only records |
| late evidence | declared observed/publication time must be within the frozen evidence deadline; sealed cases reject additions |
| evidence mutation | evidence records are write-once and case snapshots are root-addressed |
| malformed digest | exactly 64 hexadecimal characters, canonical lowercase storage |
| prompt injection in evidence | evidence is data, not instructions; Phase 2 prompts delimit and explicitly ignore embedded instructions |
| validator result shopping | strict bounded result schema, custom semantic equivalence, independent evidence evaluation planned in Phase 2 |
| technical failure becoming `NO` | source/infrastructure statuses remain distinct from business outcomes; Phase 1 has no result placeholder |
| unauthorized lifecycle change | every write checks the exact current state and creator permissions where required |
| final-case reopening | terminal states have no outgoing mutation path |

## Known Phase 1 limitations

- The semantic adjudicator and GenLayer custom equivalence are not yet
  implemented. Calls fail closed rather than producing a verdict.
- Evidence transport fetching and response authentication are not performed by
  the deterministic metadata contract in Phase 1. Digest and byte length are
  accepted as authenticated gate inputs and will be bound to the Phase 2
  validator/evidence adapter.
- Challenge-window wall-clock enforcement is scaffolded in stored charter and
  resolution fields; it becomes active with Phase 2 resolution timestamps.

