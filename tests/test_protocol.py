import hashlib
import importlib
import json
import os
from pathlib import Path
import sys

import pytest


RULESET_HASH = "85e60d8d3268867021e1e340c206b8ed63f3fb2cc5110c406849ba8af24552cb"
ROOT_HASH = "6ead5878d14c77dcde12ff584ce41b3616e8352b503c275ed86b593f3470b648"
QUALITY_PATH = Path("fixtures/documents/quality-inspection-title-only.txt")
QUALITY_BYTES = QUALITY_PATH.read_bytes()
QUALITY_HASH = hashlib.sha256(QUALITY_BYTES).hexdigest()
QUALITY_LENGTH = len(QUALITY_BYTES)


def _evidence_set_hash(*, evidence_id: str, document_id: str, sha256: str, byte_length: int, version: int = 1) -> str:
    canonical = f"{evidence_id}|{document_id}|{sha256}|{byte_length}|{version};"
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _install_direct_nondet_patch():
    from gltest.direct import wasi_mock

    try:
        gl_vm = importlib.import_module("genlayer.gl.vm")
    except ModuleNotFoundError:
        gl_vm = importlib.import_module("genlayer.vm")
    sys.modules["genlayer.vm"] = gl_vm
    if not getattr(gl_vm, "_clearlc_direct_patch", False):
        def run_nondet_direct(leader_fn, validator_fn, /, **kwargs):
            result = leader_fn()
            wasi_mock.get_vm()._captured_validators.append((result, leader_fn, validator_fn))
            return result

        gl_vm.run_nondet_unsafe = run_nondet_direct
        gl_vm.run_nondet = run_nondet_direct
        gl_vm._clearlc_direct_patch = True
    gl_runtime = importlib.import_module("genlayer")
    if not getattr(gl_runtime, "_clearlc_5jyc_direct_patch", False):
        original_llm_handler = wasi_mock._handle_llm_request

        def handle_llm_as_text(vm, data):
            result = original_llm_handler(vm, data)
            if isinstance(result, dict) and isinstance(result.get("ok"), dict):
                result["ok"] = json.dumps(result["ok"])
            return result

        wasi_mock._handle_llm_request = handle_llm_as_text
        gl_runtime._clearlc_5jyc_direct_patch = True


def _bootstrap(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, *, credit_id="CR-TEST-001"):
    contract = direct_deploy(os.environ.get("CLEARLC_CONTRACT_PATH", "contracts/clearlc.py"))
    _install_direct_nondet_patch()
    try:
        from genlayer.py.types import Address
    except ModuleNotFoundError:
        from genlayer.types import Address

    def canonical(raw):
        return str(Address(raw)) if isinstance(raw, bytes) else str(raw)

    applicant = canonical(direct_alice)
    beneficiary = canonical(direct_bob)
    examiner = canonical(direct_charlie)
    direct_vm.warp("2025-12-01T00:00:00Z")
    direct_vm.sender = direct_alice
    contract.create_credit(
        credit_id,
        applicant,
        beneficiary,
        examiner,
        250000,
        "GEN accounting units",
        1800000000,
        1790000000,
        1780000000,
        "clearlc-synthetic-ops",
        RULESET_HASH,
    )
    contract.define_requirement(
        credit_id,
        "REQ-QUALITY",
        1,
        "Certificate of Quality",
        True,
        "independent surveyor",
        "issuer and quality fields must be present",
        "Certificate of Quality issued by an independent surveyor",
        "synthetic-ops-1.0.0",
    )
    contract.set_requirements_root(credit_id, ROOT_HASH)
    direct_vm.value = 250000
    contract.fund_credit(credit_id)
    direct_vm.sender = direct_bob
    contract.accept_credit(credit_id)
    direct_vm.sender = direct_alice
    contract.freeze_credit(credit_id)
    return contract, applicant, beneficiary, examiner


def _commit_quality(
    contract,
    direct_vm,
    direct_bob,
    *,
    credit_id,
    presentation_id,
    evidence_id="EV-QUALITY-1",
    version=1,
    submit=True,
    source_uri="https://evidence.clearlc.demo/quality-inspection-title-only.txt",
):
    direct_vm.sender = direct_bob
    contract.commit_evidence(
        evidence_id,
        "DOC-QUALITY-1",
        credit_id,
        presentation_id,
        1,
        "Certificate of Quality",
        "Delta Surveyors Nigeria DEMO",
        "Atlas Commodities Ltd.",
        source_uri,
        QUALITY_HASH,
        QUALITY_LENGTH,
        1764000000,
        1764547200,
        "authority-demo-delta-surveyors",
        version,
    )
    if submit:
        contract.submit_presentation(
            credit_id,
            presentation_id,
            version,
            1,
            _evidence_set_hash(
                evidence_id=evidence_id,
                document_id="DOC-QUALITY-1",
                sha256=QUALITY_HASH,
                byte_length=QUALITY_LENGTH,
                version=version,
            ),
            "",
        )


@pytest.mark.direct
def test_authorization_and_state_machine(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract, applicant, beneficiary, examiner = _bootstrap(
        direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
    )
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("UNAUTHORIZED_CALLER"):
        contract.freeze_credit("CR-TEST-001")

    _commit_quality(contract, direct_vm, direct_bob, credit_id="CR-TEST-001", presentation_id="PRES-1")
    direct_vm.sender = direct_charlie
    contract.begin_examination("CR-TEST-001", "PRES-1")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("UNAUTHORIZED_CALLER"):
        contract.record_requirement_check("CR-TEST-001", "PRES-1", "REQ-QUALITY", "SATISFIED", "EV-QUALITY-1", "")


@pytest.mark.direct
def test_clean_presentation_reaches_settlement_and_cannot_double_settle(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, _, _, examiner = _bootstrap(
        direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, credit_id="CR-CLEAN"
    )
    _commit_quality(contract, direct_vm, direct_bob, credit_id="CR-CLEAN", presentation_id="PRES-CLEAN")
    direct_vm.sender = direct_charlie
    contract.begin_examination("CR-CLEAN", "PRES-CLEAN")
    contract.record_requirement_check("CR-CLEAN", "PRES-CLEAN", "REQ-QUALITY", "SATISFIED", "EV-QUALITY-1", "")
    contract.finalize_examination("CR-CLEAN", "PRES-CLEAN")
    contract.mark_settlement_ready("CR-CLEAN")
    contract.settle_credit("CR-CLEAN")
    assert json.loads(contract.get_credit("CR-CLEAN"))["status"] == "SETTLED"
    with direct_vm.expect_revert("CREDIT_TERMINAL"):
        contract.settle_credit("CR-CLEAN")


@pytest.mark.direct
def test_evidence_identity_and_replacement_are_immutable(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, _, _, _ = _bootstrap(
        direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, credit_id="CR-EVIDENCE"
    )
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("EVIDENCE_ID_REPLAY"):
        _commit_quality(contract, direct_vm, direct_bob, credit_id="CR-EVIDENCE", presentation_id="PRES-A", submit=False)
        _commit_quality(contract, direct_vm, direct_bob, credit_id="CR-EVIDENCE", presentation_id="PRES-B", submit=False)

    with direct_vm.expect_revert("EVIDENCE_VERSION_NOT_NEW"):
        contract.commit_evidence(
            "EV-QUALITY-2",
            "DOC-QUALITY-2",
            "CR-EVIDENCE",
            "PRES-A",
            1,
            "Certificate of Quality",
            "Delta Surveyors Nigeria DEMO",
            "Atlas Commodities Ltd.",
            "https://evidence.clearlc.demo/quality-inspection-title-only.txt",
            QUALITY_HASH,
            QUALITY_LENGTH,
            1764000000,
            1764547200,
            "authority-demo-delta-surveyors",
            1,
        )


@pytest.mark.direct
def test_semantic_challenge_is_bounded_independently_validated_and_not_rerunnable(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, _, _, _ = _bootstrap(
        direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, credit_id="CR-SEMANTIC"
    )
    _commit_quality(contract, direct_vm, direct_bob, credit_id="CR-SEMANTIC", presentation_id="PRES-SEMANTIC")
    direct_vm.sender = direct_charlie
    contract.begin_examination("CR-SEMANTIC", "PRES-SEMANTIC")
    contract.record_requirement_check("CR-SEMANTIC", "PRES-SEMANTIC", "REQ-QUALITY", "SEMANTIC_REVIEW", "EV-QUALITY-1", "Title differs")
    evidence_set_hash = json.loads(contract.get_presentation("PRES-SEMANTIC"))["evidence_set_hash"]
    contract.file_discrepancy(
        "CR-SEMANTIC",
        "PRES-SEMANTIC",
        "DISC-QUALITY-1",
        "REQ-QUALITY",
        "SEMANTIC",
        "TITLE_ONLY_MISMATCH",
        evidence_set_hash,
        "EV-QUALITY-1",
    )
    contract.finalize_examination("CR-SEMANTIC", "PRES-SEMANTIC")
    direct_vm.sender = direct_bob
    contract.challenge_discrepancy("CR-SEMANTIC", "DISC-QUALITY-1")
    direct_vm.mock_web(
        r".*",
        {"status": 200, "body": QUALITY_BYTES.decode("utf-8")},
    )
    direct_vm.mock_llm(
        r".*",
        json.dumps(
            {
                "decision": "INVALID_DISCREPANCY",
                "reason_code": "TITLE_ONLY_MISMATCH",
                "requirement_id": "REQ-QUALITY",
                "discrepancy_id": "DISC-QUALITY-1",
                "evidence_status": "AVAILABLE",
            }
        ),
    )
    direct_vm.sender = direct_charlie
    contract.adjudicate_discrepancy("CR-SEMANTIC", "DISC-QUALITY-1")
    assert direct_vm.run_validator() is True
    result = json.loads(contract.get_discrepancy("DISC-QUALITY-1"))
    assert result["status"] == "INVALID_DISCREPANCY"
    assert result["semantic_finalized"] is True
    with direct_vm.expect_revert("SEMANTIC_RESULT_ALREADY_FINALIZED"):
        contract.adjudicate_discrepancy("CR-SEMANTIC", "DISC-QUALITY-1")


@pytest.mark.direct
def test_inconclusive_is_not_beneficiary_loss_and_expiry_is_strict(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, _, _, _ = _bootstrap(
        direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, credit_id="CR-EXPIRY"
    )
    direct_vm.warp("2027-01-15T00:00:00Z")
    with direct_vm.expect_revert("PRESENTATION_DEADLINE_PASSED"):
        _commit_quality(contract, direct_vm, direct_bob, credit_id="CR-EXPIRY", presentation_id="PRES-LATE")

    direct_vm.warp("2027-01-15T00:00:01Z")
    with direct_vm.expect_revert("CREDIT_NOT_EXPIRED"):
        contract.expire_credit("CR-EXPIRY")
    direct_vm.warp("2027-01-16T00:00:00Z")
    contract.expire_credit("CR-EXPIRY")
    with direct_vm.expect_revert("CREDIT_TERMINAL"):
        contract.mark_settlement_ready("CR-EXPIRY")
