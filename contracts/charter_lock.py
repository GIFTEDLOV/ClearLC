# { "Depends": "py-genlayer:latest" }

"""CharterLock Protocol deterministic core.

Phase 1 deliberately stops at the semantic adjudication boundary. This file
does not fetch the web, execute a model, or manufacture a business verdict.
All protocol-critical inputs and lifecycle consequences before that boundary
are deterministic and persisted as canonical JSON records.
"""

import hashlib
import json
import re
import typing
import urllib.parse

import genlayer as gl


TreeMap = gl.storage.TreeMap
DynArray = gl.storage.DynArray
u8 = gl.u8
u32 = gl.u32
u64 = gl.u64
u256 = gl.u256


PROTOCOL_NAME = "CharterLock Protocol"
PROTOCOL_VERSION = "0.1.0-phase1"
SCHEMA_BINARY_EVENT_V1 = "BINARY_EVENT_V1"

CHARTER_DRAFT = "DRAFT"
CHARTER_FROZEN = "FROZEN"

CASE_OPEN = "OPEN"
CASE_EVIDENCE_SEALED = "EVIDENCE_SEALED"
CASE_ADJUDICATED = "ADJUDICATED"
CASE_CHALLENGEABLE = "CHALLENGEABLE"
CASE_CHALLENGED = "CHALLENGED"
CASE_READJUDICATED = "READJUDICATED"
CASE_FINAL = "FINAL"

TEMPORAL_VALUES = (
    "OCCURRENCE_BY_DEADLINE",
    "PUBLIC_CONFIRMATION_BY_DEADLINE",
    "OFFICIAL_CONFIRMATION_BY_DEADLINE",
    "OCCURRENCE_AND_CONFIRMATION_BY_DEADLINE",
)
AUTHORITY_CLASSES = (
    "OFFICIAL",
    "PRIMARY",
    "SECONDARY",
    "PUBLIC_RECORD",
    "REGULATOR",
)
AUTHORITY_POLICY = "REGISTERED_AUTHORITY_REQUIRED"
SOURCE_POLICY = "BOUND_HOSTNAME_AND_PATH"
CONFLICT_POLICIES = ("CONFLICT_INCONCLUSIVE", "CONFLICT_FAIL_CLOSED")
UNAVAILABLE_POLICIES = ("UNAVAILABLE_RETRY", "UNAVAILABLE_INCONCLUSIVE")
CHALLENGE_GROUNDS = ("NEW_ADMISSIBLE_EVIDENCE", "PROCEDURAL_VIOLATION")

MAX_SCHEMA_BYTES = 32
MAX_DOMAIN_BYTES = 128
MAX_QUESTION_BYTES = 4096
MAX_POLICY_BYTES = 1024
MAX_AUTHORITY_ID_BYTES = 64
MAX_SUBJECT_BYTES = 256
MAX_URL_BYTES = 2048
MAX_PATH_BYTES = 512
MAX_QUERY_BYTES = 512
MAX_CONTENT_BYTES = 2_000_000
MAX_EVIDENCE_PER_CASE = 128
MAX_AUTHORITIES_PER_CHARTER = 32
MAX_CHALLENGE_GENERATIONS = 8
MAX_SEMANTIC_OUTPUT_BYTES = 4096
U256_MAX = 2**256 - 1


def _fail(code: str) -> typing.NoReturn:
    raise gl.vm.UserError("CHARTERLOCK:" + code)


def _canonical(value: typing.Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _byte_len(value: str) -> int:
    return len(value.encode("utf-8"))


def _require_text(value: str, name: str, maximum: int, allow_empty: bool = False) -> None:
    if not isinstance(value, str):
        _fail("INVALID_" + name.upper())
    if not allow_empty and len(value.strip()) == 0:
        _fail("EMPTY_" + name.upper())
    if _byte_len(value) > maximum:
        _fail("OVERSIZED_" + name.upper())
    for character in value:
        if ord(character) < 32 or ord(character) == 127:
            _fail("CONTROL_CHARACTER_" + name.upper())


def _require_token(value: str, name: str, maximum: int) -> None:
    _require_text(value, name, maximum)
    if value != value.strip() or any(character.isspace() for character in value):
        _fail("INVALID_" + name.upper())


def _normalize_hostname(hostname: str) -> str:
    _require_text(hostname, "hostname", 253)
    try:
        normalized = hostname.encode("idna").decode("ascii").lower()
    except Exception:
        _fail("INVALID_HOSTNAME")
    if normalized.endswith(".") or len(normalized) > 253:
        _fail("INVALID_HOSTNAME")
    labels = normalized.split(".")
    if len(labels) < 2:
        _fail("INVALID_HOSTNAME")
    for label in labels:
        if len(label) == 0 or len(label) > 63:
            _fail("INVALID_HOSTNAME")
        if label[0] == "-" or label[-1] == "-":
            _fail("INVALID_HOSTNAME")
        if re.fullmatch(r"[a-z0-9-]+", label) is None:
            _fail("INVALID_HOSTNAME")
    return normalized


def _normalize_url(source_url: str) -> dict[str, str]:
    _require_text(source_url, "source_url", MAX_URL_BYTES)
    try:
        parsed = urllib.parse.urlsplit(source_url)
        hostname = parsed.hostname
        port = parsed.port
    except Exception:
        _fail("MALFORMED_URL")
    if parsed.scheme.lower() != "https":
        _fail("HTTPS_REQUIRED")
    if hostname is None or parsed.username is not None or parsed.password is not None:
        _fail("URL_CREDENTIALS_OR_HOST")
    if port is not None or parsed.fragment != "":
        _fail("URL_PORT_OR_FRAGMENT")
    normalized_hostname = _normalize_hostname(hostname)
    path = parsed.path if parsed.path != "" else "/"
    if _byte_len(path) > MAX_PATH_BYTES or _byte_len(parsed.query) > MAX_QUERY_BYTES:
        _fail("OVERSIZED_URL_COMPONENT")
    normalized = "https://" + normalized_hostname + path
    if parsed.query != "":
        normalized += "?" + parsed.query
    return {
        "normalized_url": normalized,
        "normalized_hostname": normalized_hostname,
        "path": path,
    }


def _validate_path_prefix(path_prefix: str) -> str:
    _require_text(path_prefix, "path_prefix", 128, allow_empty=True)
    if path_prefix != "" and not path_prefix.startswith("/"):
        _fail("INVALID_PATH_PREFIX")
    if "?" in path_prefix or "#" in path_prefix:
        _fail("INVALID_PATH_PREFIX")
    return path_prefix if path_prefix != "" else "/"


def _path_matches(path: str, path_prefix: str) -> bool:
    if path_prefix == "/":
        return True
    if path == path_prefix:
        return True
    return path.startswith(path_prefix + "/")


def _parse_allowed_outcomes(raw: str) -> list[str]:
    _require_text(raw, "allowed_outcomes", 256)
    try:
        parsed = json.loads(raw)
    except Exception:
        _fail("MALFORMED_ALLOWED_OUTCOMES")
    if not isinstance(parsed, list) or len(parsed) != 2:
        _fail("INVALID_ALLOWED_OUTCOMES")
    values: list[str] = []
    for item in parsed:
        if not isinstance(item, str) or item not in ("YES", "NO"):
            _fail("INVALID_ALLOWED_OUTCOME")
        if item in values:
            _fail("DUPLICATE_ALLOWED_OUTCOME")
        values.append(item)
    if "YES" not in values or "NO" not in values:
        _fail("BINARY_OUTCOMES_REQUIRED")
    return ["YES", "NO"]


def _validate_sha256(content_sha256: str) -> str:
    _require_text(content_sha256, "content_sha256", 64)
    normalized = content_sha256.lower()
    if len(normalized) != 64 or re.fullmatch(r"[0-9a-f]{64}", normalized) is None:
        _fail("MALFORMED_SHA256")
    return normalized


def _load_record(raw: str, code: str) -> dict[str, typing.Any]:
    try:
        value = json.loads(raw)
    except Exception:
        _fail(code)
    if not isinstance(value, dict):
        _fail(code)
    return typing.cast(dict[str, typing.Any], value)


def _load_list(raw: str, code: str) -> list[str]:
    try:
        value = json.loads(raw)
    except Exception:
        _fail(code)
    if not isinstance(value, list):
        _fail(code)
    result: list[str] = []
    for item in value:
        if not isinstance(item, str):
            _fail(code)
        result.append(item)
    return result


class CharterLock(gl.contract.Contract):
    """Deterministic CharterLock storage and lifecycle boundary."""

    charter_count: u256
    case_count: u256
    evidence_count: u256
    challenge_count: u256
    resolution_count: u256

    charter_records: TreeMap[str, str]
    charter_ids: DynArray[str]
    authority_records: TreeMap[str, str]
    case_records: TreeMap[str, str]
    case_ids: DynArray[str]
    evidence_records: TreeMap[str, str]
    evidence_fingerprints: TreeMap[str, str]
    evidence_ids_by_case: TreeMap[str, str]
    challenge_records: TreeMap[str, str]
    challenge_ids_by_case: TreeMap[str, str]
    resolution_records: TreeMap[str, str]
    resolution_history_by_case: TreeMap[str, str]

    def __init__(self):
        self.charter_count = u256(0)  # pyright: ignore[reportCallIssue]
        self.case_count = u256(0)  # pyright: ignore[reportCallIssue]
        self.evidence_count = u256(0)  # pyright: ignore[reportCallIssue]
        self.challenge_count = u256(0)  # pyright: ignore[reportCallIssue]
        self.resolution_count = u256(0)  # pyright: ignore[reportCallIssue]

    def _sender(self) -> str:
        return gl.message.sender_address.as_hex

    def _next_identifier(self, prefix: str, current: u256) -> tuple[str, u256]:
        value = int(current) + 1
        if value > U256_MAX:
            _fail("ID_COUNTER_OVERFLOW")
        return prefix + "-" + str(value).zfill(8), u256(value)  # pyright: ignore[reportCallIssue]

    def _get_charter(self, charter_id: str) -> dict[str, typing.Any]:
        record = self.charter_records.get(charter_id)
        if record is None:
            _fail("CHARTER_NOT_FOUND")
        return _load_record(record, "CORRUPT_CHARTER")

    def _get_case(self, case_id: str) -> dict[str, typing.Any]:
        record = self.case_records.get(case_id)
        if record is None:
            _fail("CASE_NOT_FOUND")
        return _load_record(record, "CORRUPT_CASE")

    def _save_case(self, case: dict[str, typing.Any]) -> None:
        self.case_records[str(case["case_id"])] = _canonical(case)

    def _require_case_state(self, case: dict[str, typing.Any], expected: str) -> None:
        if case.get("state") != expected:
            _fail("INVALID_CASE_TRANSITION")

    def _require_charter_creator(self, charter: dict[str, typing.Any]) -> None:
        if charter.get("creator") != self._sender():
            _fail("UNAUTHORIZED_CHARTER_MUTATION")

    def _authority_key(self, charter_id: str, authority_id: str) -> str:
        return charter_id + "::" + authority_id

    def _authority_ids(self, charter_id: str) -> list[str]:
        charter = self._get_charter(charter_id)
        return typing.cast(list[str], charter["authority_ids"])

    def _snapshot_root(self, case_id: str, evidence_ids: list[str]) -> str:
        snapshot: list[dict[str, typing.Any]] = []
        for evidence_id in evidence_ids:
            raw = self.evidence_records.get(evidence_id)
            if raw is None:
                _fail("CORRUPT_EVIDENCE_HISTORY")
            evidence = _load_record(raw, "CORRUPT_EVIDENCE")
            if evidence.get("case_id") != case_id:
                _fail("EVIDENCE_CASE_MISMATCH")
            snapshot.append(
                {
                    "evidence_id": evidence["evidence_id"],
                    "authority_key": evidence["authority_key"],
                    "normalized_url": evidence["normalized_url"],
                    "content_sha256": evidence["content_sha256"],
                    "content_byte_length": evidence["content_byte_length"],
                    "observed_at": evidence["observed_at"],
                    "published_at": evidence["published_at"],
                    "evidence_generation": evidence["evidence_generation"],
                    "admissibility_state": evidence["admissibility_state"],
                }
            )
        return "0x" + hashlib.sha256(_canonical(snapshot).encode("utf-8")).hexdigest()

    @gl.public.write
    def create_charter(
        self,
        schema_version: str,
        domain: str,
        question: str,
        allowed_outcomes: str,
        event_deadline: u64,
        evidence_deadline: u64,
        temporal_semantics: str,
        authority_policy: str,
        source_policy: str,
        min_corroboration: u8,
        conflict_policy: str,
        unavailable_source_policy: str,
        challenge_window_seconds: u64,
        max_challenge_generations: u8,
    ) -> str:
        _require_token(schema_version, "schema_version", MAX_SCHEMA_BYTES)
        if schema_version != SCHEMA_BINARY_EVENT_V1:
            _fail("INVALID_SCHEMA_VERSION")
        _require_text(domain, "domain", MAX_DOMAIN_BYTES)
        _require_text(question, "question", MAX_QUESTION_BYTES)
        outcomes = _parse_allowed_outcomes(allowed_outcomes)
        event_deadline_int = int(event_deadline)
        evidence_deadline_int = int(evidence_deadline)
        if event_deadline_int <= 0 or evidence_deadline_int <= event_deadline_int:
            _fail("INVALID_DEADLINE_ORDER")
        if temporal_semantics not in TEMPORAL_VALUES:
            _fail("INVALID_TEMPORAL_SEMANTICS")
        if authority_policy != AUTHORITY_POLICY:
            _fail("INVALID_AUTHORITY_POLICY")
        if source_policy != SOURCE_POLICY:
            _fail("INVALID_SOURCE_POLICY")
        if int(min_corroboration) < 1 or int(min_corroboration) > MAX_AUTHORITIES_PER_CHARTER:
            _fail("INVALID_MIN_CORROBORATION")
        if conflict_policy not in CONFLICT_POLICIES:
            _fail("INVALID_CONFLICT_POLICY")
        if unavailable_source_policy not in UNAVAILABLE_POLICIES:
            _fail("INVALID_UNAVAILABLE_SOURCE_POLICY")
        if int(challenge_window_seconds) < 1 or int(challenge_window_seconds) > 2_592_000:
            _fail("INVALID_CHALLENGE_WINDOW")
        if int(max_challenge_generations) > MAX_CHALLENGE_GENERATIONS:
            _fail("INVALID_CHALLENGE_GENERATIONS")

        charter_id, next_count = self._next_identifier("CHR", self.charter_count)
        self.charter_count = next_count
        charter = {
            "charter_id": charter_id,
            "creator": self._sender(),
            "schema_version": schema_version,
            "domain": domain,
            "question": question,
            "allowed_outcomes": outcomes,
            "event_deadline": event_deadline_int,
            "evidence_deadline": evidence_deadline_int,
            "temporal_semantics": temporal_semantics,
            "authority_policy": authority_policy,
            "source_policy": source_policy,
            "min_corroboration": int(min_corroboration),
            "conflict_policy": conflict_policy,
            "unavailable_source_policy": unavailable_source_policy,
            "challenge_window_seconds": int(challenge_window_seconds),
            "max_challenge_generations": int(max_challenge_generations),
            "state": CHARTER_DRAFT,
            "authority_ids": [],
            "charter_hash": "",
        }
        self.charter_records[charter_id] = _canonical(charter)
        self.charter_ids.append(charter_id)
        return charter_id

    @gl.public.write
    def add_authority_rule(
        self,
        charter_id: str,
        authority_id: str,
        authority_class: str,
        hostname: str,
        path_prefix: str,
        subject: str,
        priority: u8,
    ) -> None:
        charter = self._get_charter(charter_id)
        self._require_charter_creator(charter)
        if charter.get("state") != CHARTER_DRAFT:
            _fail("CHARTER_ALREADY_FROZEN")
        _require_token(authority_id, "authority_id", MAX_AUTHORITY_ID_BYTES)
        if authority_class not in AUTHORITY_CLASSES:
            _fail("INVALID_AUTHORITY_CLASS")
        normalized_hostname = _normalize_hostname(hostname)
        normalized_prefix = _validate_path_prefix(path_prefix)
        _require_text(subject, "subject", MAX_SUBJECT_BYTES)
        if int(priority) > 255:
            _fail("INVALID_AUTHORITY_PRIORITY")
        authority_ids = self._authority_ids(charter_id)
        if len(authority_ids) >= MAX_AUTHORITIES_PER_CHARTER:
            _fail("AUTHORITY_LIMIT")
        if authority_id in authority_ids:
            _fail("DUPLICATE_AUTHORITY")
        authority_key = self._authority_key(charter_id, authority_id)
        authority = {
            "authority_key": authority_key,
            "charter_id": charter_id,
            "authority_id": authority_id,
            "authority_class": authority_class,
            "hostname": normalized_hostname,
            "path_prefix": normalized_prefix,
            "subject": subject,
            "priority": int(priority),
            "active_at_freeze": True,
        }
        self.authority_records[authority_key] = _canonical(authority)
        authority_ids.append(authority_id)
        charter["authority_ids"] = authority_ids
        self.charter_records[charter_id] = _canonical(charter)

    @gl.public.write
    def freeze_charter(self, charter_id: str) -> str:
        charter = self._get_charter(charter_id)
        self._require_charter_creator(charter)
        if charter.get("state") != CHARTER_DRAFT:
            _fail("CHARTER_NOT_DRAFT")
        authority_ids = self._authority_ids(charter_id)
        if len(authority_ids) == 0:
            _fail("AUTHORITY_REQUIRED_BEFORE_FREEZE")
        if int(charter["min_corroboration"]) > len(authority_ids):
            _fail("CORROBORATION_EXCEEDS_AUTHORITIES")
        authorities: list[dict[str, typing.Any]] = []
        for authority_id in authority_ids:
            authority_key = self._authority_key(charter_id, authority_id)
            raw = self.authority_records.get(authority_key)
            if raw is None:
                _fail("CORRUPT_AUTHORITY")
            authorities.append(_load_record(raw, "CORRUPT_AUTHORITY"))
        charter["authority_ids"] = authority_ids
        charter["authority_snapshot"] = authorities
        charter_for_hash = dict(charter)
        charter_for_hash.pop("charter_hash", None)
        charter_for_hash["state"] = CHARTER_FROZEN
        charter_hash = "0x" + hashlib.sha256(
            _canonical(charter_for_hash).encode("utf-8")
        ).hexdigest()
        charter["authority_snapshot"] = authorities
        charter["charter_hash"] = charter_hash
        charter["state"] = CHARTER_FROZEN
        self.charter_records[charter_id] = _canonical(charter)
        return charter_hash

    @gl.public.write
    def open_case(self, charter_id: str) -> str:
        charter = self._get_charter(charter_id)
        if charter.get("state") != CHARTER_FROZEN:
            _fail("CHARTER_MUST_BE_FROZEN")
        case_id, next_count = self._next_identifier("CASE", self.case_count)
        self.case_count = next_count
        case = {
            "case_id": case_id,
            "charter_id": charter_id,
            "charter_hash": charter["charter_hash"],
            "creator": self._sender(),
            "state": CASE_OPEN,
            "evidence_deadline": charter["evidence_deadline"],
            "evidence_root": "",
            "evidence_count": 0,
            "generation": 0,
            "challenge_count": 0,
            "active_resolution_id": "",
            "terminal": False,
        }
        self.case_records[case_id] = _canonical(case)
        self.case_ids.append(case_id)
        self.evidence_ids_by_case[case_id] = "[]"
        self.challenge_ids_by_case[case_id] = "[]"
        self.resolution_history_by_case[case_id] = "[]"
        return case_id

    @gl.public.write
    def add_evidence(
        self,
        case_id: str,
        authority_id: str,
        source_url: str,
        content_sha256: str,
        content_byte_length: u32,
        observed_at: u64,
        published_at: u64,
    ) -> str:
        case = self._get_case(case_id)
        self._require_case_state(case, CASE_OPEN)
        if int(case["evidence_count"]) >= MAX_EVIDENCE_PER_CASE:
            _fail("EVIDENCE_LIMIT")
        charter = self._get_charter(str(case["charter_id"]))
        authority_ids = typing.cast(list[str], charter["authority_ids"])
        if authority_id not in authority_ids:
            _fail("UNKNOWN_AUTHORITY")
        authority_key = self._authority_key(str(case["charter_id"]), authority_id)
        authority_raw = self.authority_records.get(authority_key)
        if authority_raw is None:
            _fail("UNKNOWN_AUTHORITY")
        authority = _load_record(authority_raw, "CORRUPT_AUTHORITY")
        normalized = _normalize_url(source_url)
        if normalized["normalized_hostname"] != authority["hostname"]:
            _fail("AUTHORITY_HOSTNAME_MISMATCH")
        if not _path_matches(normalized["path"], str(authority["path_prefix"])):
            _fail("AUTHORITY_PATH_MISMATCH")
        digest = _validate_sha256(content_sha256)
        byte_length = int(content_byte_length)
        if byte_length < 1 or byte_length > MAX_CONTENT_BYTES:
            _fail("INVALID_CONTENT_BYTE_LENGTH")
        observed = int(observed_at)
        published = int(published_at)
        if observed < 0 or observed > int(case["evidence_deadline"]):
            _fail("EVIDENCE_AFTER_DEADLINE")
        if published < 0 or (published != 0 and published > observed):
            _fail("INVALID_PUBLICATION_TIME")
        if published > int(case["evidence_deadline"]):
            _fail("EVIDENCE_AFTER_DEADLINE")

        fingerprint_value = {
            "case_id": case_id,
            "authority_key": authority_key,
            "normalized_url": normalized["normalized_url"],
            "content_sha256": digest,
            "content_byte_length": byte_length,
            "observed_at": observed,
            "published_at": published,
        }
        fingerprint = "0x" + hashlib.sha256(
            _canonical(fingerprint_value).encode("utf-8")
        ).hexdigest()
        if self.evidence_fingerprints.get(fingerprint) is not None:
            _fail("DUPLICATE_EVIDENCE")
        evidence_id, next_count = self._next_identifier("EVID", self.evidence_count)
        self.evidence_count = next_count
        evidence = {
            "evidence_id": evidence_id,
            "case_id": case_id,
            "authority_id": authority_id,
            "authority_key": authority_key,
            "source_url": source_url,
            "normalized_url": normalized["normalized_url"],
            "normalized_hostname": normalized["normalized_hostname"],
            "content_sha256": digest,
            "content_byte_length": byte_length,
            "observed_at": observed,
            "published_at": published,
            "evidence_generation": int(case["generation"]),
            "admissibility_state": "ADMISSIBLE",
            "fingerprint": fingerprint,
        }
        self.evidence_records[evidence_id] = _canonical(evidence)
        self.evidence_fingerprints[fingerprint] = evidence_id
        evidence_ids = _load_list(self.evidence_ids_by_case.get(case_id, "[]"), "CORRUPT_EVIDENCE_INDEX")
        evidence_ids.append(evidence_id)
        self.evidence_ids_by_case[case_id] = _canonical(evidence_ids)
        case["evidence_count"] = len(evidence_ids)
        self._save_case(case)
        return evidence_id

    @gl.public.write
    def seal_evidence(self, case_id: str) -> str:
        case = self._get_case(case_id)
        if case.get("creator") != self._sender():
            _fail("UNAUTHORIZED_EVIDENCE_SEAL")
        self._require_case_state(case, CASE_OPEN)
        evidence_ids = _load_list(self.evidence_ids_by_case.get(case_id, "[]"), "CORRUPT_EVIDENCE_INDEX")
        root = self._snapshot_root(case_id, evidence_ids)
        case["evidence_root"] = root
        case["state"] = CASE_EVIDENCE_SEALED
        self._save_case(case)
        return root

    def _semantic_boundary(self) -> typing.NoReturn:
        _fail("SEMANTIC_ADJUDICATOR_NOT_IMPLEMENTED")

    @gl.public.write
    def adjudicate(self, case_id: str) -> None:
        case = self._get_case(case_id)
        self._require_case_state(case, CASE_EVIDENCE_SEALED)
        # Phase 2 will call bounded GenLayer semantic consensus here. This
        # boundary intentionally performs no state mutation and cannot produce
        # YES/NO by caller fiat.
        self._semantic_boundary()

    @gl.public.write
    def challenge(self, case_id: str, challenge_ground: str, evidence_id: str) -> str:
        case = self._get_case(case_id)
        self._require_case_state(case, CASE_CHALLENGEABLE)
        if challenge_ground not in CHALLENGE_GROUNDS:
            _fail("INVALID_CHALLENGE_GROUND")
        max_generations = int(self._get_charter(str(case["charter_id"]))["max_challenge_generations"])
        if int(case["generation"]) >= max_generations:
            _fail("CHALLENGE_GENERATION_LIMIT")
        if challenge_ground == "NEW_ADMISSIBLE_EVIDENCE":
            if evidence_id == "":
                _fail("NEW_EVIDENCE_REQUIRED")
            evidence_raw = self.evidence_records.get(evidence_id)
            if evidence_raw is None:
                _fail("CHALLENGE_EVIDENCE_NOT_FOUND")
            evidence = _load_record(evidence_raw, "CORRUPT_EVIDENCE")
            if evidence.get("case_id") != case_id:
                _fail("CHALLENGE_EVIDENCE_CASE_MISMATCH")
            if int(evidence.get("evidence_generation", 0)) <= int(case["generation"]):
                _fail("EVIDENCE_NOT_MATERIALLY_NEW")
        elif evidence_id != "":
            _fail("PROCEDURAL_CHALLENGE_CANNOT_ATTACH_EVIDENCE")
        challenge_id, next_count = self._next_identifier("CHAL", self.challenge_count)
        self.challenge_count = next_count
        challenge = {
            "challenge_id": challenge_id,
            "case_id": case_id,
            "challenger": self._sender(),
            "challenge_ground": challenge_ground,
            "evidence_id": evidence_id,
            "previous_resolution_id": case["active_resolution_id"],
            "new_evidence_snapshot": "",
            "new_resolution_id": "",
            "status": "ACCEPTED_FOR_READJUDICATION",
        }
        self.challenge_records[challenge_id] = _canonical(challenge)
        challenge_ids = _load_list(self.challenge_ids_by_case.get(case_id, "[]"), "CORRUPT_CHALLENGE_INDEX")
        challenge_ids.append(challenge_id)
        self.challenge_ids_by_case[case_id] = _canonical(challenge_ids)
        case["challenge_count"] = len(challenge_ids)
        case["state"] = CASE_CHALLENGED
        self._save_case(case)
        return challenge_id

    @gl.public.write
    def readjudicate(self, case_id: str) -> None:
        case = self._get_case(case_id)
        self._require_case_state(case, CASE_CHALLENGED)
        self._semantic_boundary()

    @gl.public.write
    def finalize_case(self, case_id: str) -> None:
        case = self._get_case(case_id)
        if case.get("state") not in (CASE_CHALLENGEABLE, CASE_READJUDICATED):
            _fail("CASE_NOT_FINALIZABLE")
        if bool(case.get("terminal")):
            _fail("TERMINAL_CASE")
        self._semantic_boundary()

    @gl.public.view
    def get_charter(self, charter_id: str) -> dict[str, typing.Any]:
        return self._get_charter(charter_id)

    @gl.public.view
    def get_charter_ids(self) -> list[str]:
        return [str(item) for item in self.charter_ids]

    @gl.public.view
    def get_charter_count(self) -> u256:
        return self.charter_count

    @gl.public.view
    def get_case(self, case_id: str) -> dict[str, typing.Any]:
        return self._get_case(case_id)

    @gl.public.view
    def get_case_ids(self) -> list[str]:
        return [str(item) for item in self.case_ids]

    @gl.public.view
    def get_case_count(self) -> u256:
        return self.case_count

    @gl.public.view
    def get_evidence(self, evidence_id: str) -> dict[str, typing.Any]:
        raw = self.evidence_records.get(evidence_id)
        if raw is None:
            _fail("EVIDENCE_NOT_FOUND")
        return _load_record(raw, "CORRUPT_EVIDENCE")

    @gl.public.view
    def get_evidence_ids(self, case_id: str) -> list[str]:
        self._get_case(case_id)
        return _load_list(self.evidence_ids_by_case.get(case_id, "[]"), "CORRUPT_EVIDENCE_INDEX")

    @gl.public.view
    def get_resolution(self, resolution_id: str) -> dict[str, typing.Any]:
        raw = self.resolution_records.get(resolution_id)
        if raw is None:
            _fail("RESOLUTION_NOT_FOUND")
        return _load_record(raw, "CORRUPT_RESOLUTION")

    @gl.public.view
    def get_resolution_history(self, case_id: str) -> list[dict[str, typing.Any]]:
        self._get_case(case_id)
        raw_items = self.resolution_history_by_case.get(case_id, "[]")
        try:
            items = json.loads(raw_items)
        except Exception:
            _fail("CORRUPT_RESOLUTION_HISTORY")
        if not isinstance(items, list):
            _fail("CORRUPT_RESOLUTION_HISTORY")
        return typing.cast(list[dict[str, typing.Any]], items)

    @gl.public.view
    def contract_info(self) -> dict[str, typing.Any]:
        return {
            "protocol": PROTOCOL_NAME,
            "protocol_version": PROTOCOL_VERSION,
            "first_schema": SCHEMA_BINARY_EVENT_V1,
            "phase": "PHASE_1_DETERMINISTIC_CORE",
            "semantic_adjudicator_ready": False,
            "business_outcomes": ["YES", "NO"],
            "technical_states": [
                "INCONCLUSIVE",
                "INVALID_CHARTER",
                "INSUFFICIENT_EVIDENCE",
                "SOURCE_UNAVAILABLE",
                "EVIDENCE_CONFLICT",
            ],
            "no_privileged_override": True,
            "no_custody_or_betting": True,
            "charter_count": int(self.charter_count),
            "case_count": int(self.case_count),
            "evidence_count": int(self.evidence_count),
        }
