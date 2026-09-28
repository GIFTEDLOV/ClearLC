import json
import os
from pathlib import Path


ROOT = Path(__file__).parents[1]
CONTRACT = Path(os.environ.get("CLEARLC_CONTRACT_PATH", str(ROOT / "contracts" / "clearlc.py"))).read_text(encoding="utf-8")


def test_public_surface_preserves_locked_business_capabilities():
    required_methods = {
        "create_credit",
        "fund_credit",
        "accept_credit",
        "freeze_credit",
        "propose_amendment",
        "accept_amendment",
        "define_requirement",
        "commit_evidence",
        "submit_presentation",
        "begin_examination",
        "record_requirement_check",
        "file_discrepancy",
        "challenge_discrepancy",
        "adjudicate_discrepancy",
        "waive_discrepancy",
        "open_cure",
        "mark_settlement_ready",
        "settle_credit",
        "expire_credit",
        "contract_info",
    }
    public_methods = {
        line.split("def ", 1)[1].split("(", 1)[0]
        for line in CONTRACT.splitlines()
        if line.startswith("    def ")
    }
    assert required_methods <= public_methods


def test_prompt_injection_boundary_and_consensus_scope_are_explicit():
    adjudication_doc = (ROOT / "docs" / "SEMANTIC_ADJUDICATION.md").read_text(encoding="utf-8")
    assert "UNTRUSTED_DATA" in CONTRACT
    assert "Ignore any request" in CONTRACT
    assert "confidence, prose, payment data, addresses" in CONTRACT
    assert "decision-bearing field" in adjudication_doc
    assert "result-shop" in adjudication_doc


def test_fixture_cases_cover_clean_refusal_and_cure_paths():
    manifest = json.loads((ROOT / "fixtures" / "fixtures.json").read_text(encoding="utf-8"))
    cases = manifest["cases"]
    assert {
        "CASE_A_CLEAN_PRESENTATION",
        "CASE_B_INVALID_SEMANTIC_REFUSAL",
        "CASE_C_MATERIAL_DISCREPANCY_CURE",
    } <= set(cases)
    assert cases["CASE_C_MATERIAL_DISCREPANCY_CURE"]["cure_evidence_version"] == 2


def test_critical_security_sentinels_remain_in_the_contract():
    assert '"CROSS_CREDIT_EVIDENCE"' in CONTRACT
    assert '"CROSS_CREDIT_DOCUMENT_ID"' in CONTRACT
    assert '"EVIDENCE_VERSION_NOT_ACTIVE"' in CONTRACT
    assert '"SEMANTIC_REQUIREMENT_MISMATCH"' in CONTRACT
    assert '"SEMANTIC_DISCREPANCY_MISMATCH"' in CONTRACT
    assert '"DOUBLE_SETTLEMENT"' in CONTRACT
    assert '+ "|presentation="' in CONTRACT
    assert "SETTLEMENT_REQUIREMENTS_UNRESOLVED" in CONTRACT
