from __future__ import annotations

import json

import pytest

from charterlock.semantic import validate_binary_event_result


VALID_SHA = "a" * 64
BASE_URL = "https://www.example.com/archive/event"


def _deploy(direct_deploy):
    return direct_deploy("contracts/charter_lock.py")


def _create_charter(contract, **overrides):
    values = {
        "schema_version": "BINARY_EVENT_V1",
        "domain": "event-contract-resolution",
        "question": "Did the declared event occur by the frozen deadline?",
        "allowed_outcomes": json.dumps(["YES", "NO"]),
        "event_deadline": 1_800_000_000,
        "evidence_deadline": 1_800_000_600,
        "temporal_semantics": "OCCURRENCE_BY_DEADLINE",
        "authority_policy": "REGISTERED_AUTHORITY_REQUIRED",
        "source_policy": "BOUND_HOSTNAME_AND_PATH",
        "min_corroboration": 1,
        "conflict_policy": "CONFLICT_INCONCLUSIVE",
        "unavailable_source_policy": "UNAVAILABLE_INCONCLUSIVE",
        "challenge_window_seconds": 3600,
        "max_challenge_generations": 2,
    }
    values.update(overrides)
    return contract.create_charter(**values)


def _freeze(contract, charter_id):
    contract.add_authority_rule(
        charter_id,
        "authority-main",
        "PRIMARY",
        "www.example.com",
        "/archive",
        "Frozen primary source",
        1,
    )
    return contract.freeze_charter(charter_id)


def _open_case(contract):
    charter_id = _create_charter(contract)
    _freeze(contract, charter_id)
    return contract.open_case(charter_id), charter_id


def test_create_valid_charter_and_stable_ids(direct_deploy):
    contract = _deploy(direct_deploy)
    charter_id = _create_charter(contract)
    assert charter_id == "CHR-00000001"
    assert contract.get_charter_ids() == [charter_id]
    assert int(contract.get_charter_count()) == 1
    assert contract.get_charter(charter_id)["state"] == "DRAFT"


@pytest.mark.parametrize(
    "override",
    [
        {"schema_version": "BINARY_EVENT_V2"},
        {"question": ""},
        {"question": "é" * 3000},
        {"event_deadline": 10, "evidence_deadline": 10},
        {"allowed_outcomes": "[\"YES\",\"MAYBE\"]"},
        {"temporal_semantics": "HIDDEN_IN_PROSE"},
    ],
)
def test_reject_invalid_charter_inputs(direct_deploy, override):
    contract = _deploy(direct_deploy)
    with pytest.raises(Exception):
        _create_charter(contract, **override)
    assert contract.get_charter_count() == 0


def test_add_valid_authority_and_freeze_hash(direct_deploy):
    contract = _deploy(direct_deploy)
    charter_id = _create_charter(contract)
    charter_hash = _freeze(contract, charter_id)
    charter = contract.get_charter(charter_id)
    assert charter_hash == charter["charter_hash"]
    assert len(charter_hash) == 66
    assert charter["state"] == "FROZEN"
    assert charter["authority_snapshot"][0]["hostname"] == "www.example.com"


def test_reject_invalid_authority_and_authority_mutation_after_freeze(direct_deploy):
    contract = _deploy(direct_deploy)
    charter_id = _create_charter(contract)
    with pytest.raises(Exception):
        contract.add_authority_rule(charter_id, "bad", "PRIMARY", "localhost", "/", "x", 1)
    with pytest.raises(Exception):
        contract.add_authority_rule(
            charter_id,
            "bad-credentials",
            "PRIMARY",
            "user@example.com",
            "/",
            "x",
            1,
        )
    _freeze(contract, charter_id)
    with pytest.raises(Exception):
        contract.add_authority_rule(
            charter_id, "authority-second", "SECONDARY", "news.example.com", "/", "x", 2
        )
    with pytest.raises(Exception):
        contract.freeze_charter(charter_id)


def test_open_case_requires_frozen_charter(direct_deploy):
    contract = _deploy(direct_deploy)
    charter_id = _create_charter(contract)
    with pytest.raises(Exception):
        contract.open_case(charter_id)
    _freeze(contract, charter_id)
    case_id = contract.open_case(charter_id)
    assert case_id == "CASE-00000001"
    assert contract.get_case(case_id)["state"] == "OPEN"


def test_add_valid_evidence_and_canonical_identity(direct_deploy):
    contract = _deploy(direct_deploy)
    case_id, _ = _open_case(contract)
    evidence_id = contract.add_evidence(
        case_id, "authority-main", BASE_URL, VALID_SHA, 128, 1_800_000_100, 1_800_000_090
    )
    evidence = contract.get_evidence(evidence_id)
    assert evidence_id == "EVID-00000001"
    assert evidence["normalized_hostname"] == "www.example.com"
    assert evidence["content_sha256"] == VALID_SHA
    assert evidence["content_byte_length"] == 128
    assert contract.get_evidence_ids(case_id) == [evidence_id]


@pytest.mark.parametrize(
    "url",
    [
        "http://www.example.com/archive/event",
        "https://user:pass@www.example.com/archive/event",
        "https://www.example.com:443/archive/event",
        "https://www.example.com/archive/event#fragment",
        "https://www.example.com.evil.test/archive/event",
        "https://www.example.com/apix/event",
    ],
)
def test_reject_url_confusion_and_authority_mismatch(direct_deploy, url):
    contract = _deploy(direct_deploy)
    case_id, _ = _open_case(contract)
    with pytest.raises(Exception):
        contract.add_evidence(case_id, "authority-main", url, VALID_SHA, 128, 100, 0)


@pytest.mark.parametrize("digest", ["", "a" * 63, "a" * 65, "g" * 64, "0x" + "a" * 64])
def test_reject_malformed_hash(direct_deploy, digest):
    contract = _deploy(direct_deploy)
    case_id, _ = _open_case(contract)
    with pytest.raises(Exception):
        contract.add_evidence(case_id, "authority-main", BASE_URL, digest, 128, 100, 0)


def test_duplicate_evidence_and_late_evidence_fail(direct_deploy):
    contract = _deploy(direct_deploy)
    case_id, _ = _open_case(contract)
    args = (case_id, "authority-main", BASE_URL, VALID_SHA, 128, 100, 0)
    contract.add_evidence(*args)
    with pytest.raises(Exception):
        contract.add_evidence(*args)
    with pytest.raises(Exception):
        contract.add_evidence(
            case_id, "authority-main", BASE_URL, "b" * 64, 128, 1_800_000_601, 0
        )


def test_seal_evidence_freezes_snapshot_and_rejects_mutation(direct_deploy):
    contract = _deploy(direct_deploy)
    case_id, _ = _open_case(contract)
    contract.add_evidence(case_id, "authority-main", BASE_URL, VALID_SHA, 128, 100, 0)
    root = contract.seal_evidence(case_id)
    assert root == contract.get_case(case_id)["evidence_root"]
    assert contract.get_case(case_id)["state"] == "EVIDENCE_SEALED"
    with pytest.raises(Exception):
        contract.add_evidence(case_id, "authority-main", BASE_URL + "/later", "b" * 64, 64, 101, 0)
    with pytest.raises(Exception):
        contract.seal_evidence(case_id)


def test_seal_is_creator_only(direct_deploy, direct_vm, direct_alice):
    contract = _deploy(direct_deploy)
    case_id, _ = _open_case(contract)
    contract.add_evidence(case_id, "authority-main", BASE_URL, VALID_SHA, 128, 100, 0)
    with pytest.raises(Exception):
        with direct_vm.prank(direct_alice):
            contract.seal_evidence(case_id)


def test_illegal_transitions_and_fail_closed_adjudication(direct_deploy):
    contract = _deploy(direct_deploy)
    case_id, _ = _open_case(contract)
    with pytest.raises(Exception):
        contract.adjudicate(case_id)
    with pytest.raises(Exception):
        contract.challenge(case_id, "PROCEDURAL_VIOLATION", "")
    contract.seal_evidence(case_id)
    before = contract.get_case(case_id)
    with pytest.raises(Exception):
        contract.adjudicate(case_id)
    assert contract.get_case(case_id) == before
    with pytest.raises(Exception):
        contract.readjudicate(case_id)


def test_public_read_api_and_contract_info(direct_deploy):
    contract = _deploy(direct_deploy)
    charter_id = _create_charter(contract)
    info = contract.contract_info()
    assert info["protocol"] == "CharterLock Protocol"
    assert info["first_schema"] == "BINARY_EVENT_V1"
    assert info["semantic_adjudicator_ready"] is False
    assert contract.get_case_ids() == []
    assert contract.get_charter(charter_id)["schema_version"] == "BINARY_EVENT_V1"


def test_semantic_output_exact_schema_and_consistency():
    valid = {
        "selected_outcome": "YES",
        "event_occurred": True,
        "event_before_deadline": True,
        "confirmation_before_deadline": True,
        "authority_requirement_met": True,
        "corroboration_requirement_met": True,
        "evidence_conflict": False,
        "evidence_sufficient": True,
    }
    assert validate_binary_event_result(json.dumps(valid, separators=(",", ":"))) == valid
    with pytest.raises(ValueError):
        validate_binary_event_result(json.dumps({**valid, "extra": False}))
    with pytest.raises(ValueError):
        validate_binary_event_result(json.dumps({**valid, "event_occurred": "true"}))
    with pytest.raises(ValueError):
        validate_binary_event_result(json.dumps({**valid, "selected_outcome": "MAYBE"}))
    with pytest.raises(ValueError):
        validate_binary_event_result(json.dumps({**valid, "selected_outcome": "NO"}))


def test_semantic_infrastructure_states_do_not_collapse_to_no():
    base = {
        "selected_outcome": "SOURCE_UNAVAILABLE",
        "event_occurred": False,
        "event_before_deadline": False,
        "confirmation_before_deadline": False,
        "authority_requirement_met": False,
        "corroboration_requirement_met": False,
        "evidence_conflict": False,
        "evidence_sufficient": False,
    }
    assert validate_binary_event_result(json.dumps(base))["selected_outcome"] == "SOURCE_UNAVAILABLE"
