import hashlib
import json
from pathlib import Path


def test_fixture_manifest_hashes_and_lengths_are_exact():
    root = Path(__file__).parents[1]
    manifest = json.loads((root / "fixtures" / "fixtures.json").read_text(encoding="utf-8"))
    for filename, expected in manifest["documents"].items():
        content = (root / "fixtures" / "documents" / filename).read_bytes()
        assert len(content) == expected["byte_length"]
        assert hashlib.sha256(content).hexdigest() == expected["sha256"]
        assert len(expected["sha256"]) == 64
        assert expected["sha256"] == expected["sha256"].lower()


def test_ruleset_hash_is_the_frozen_fixture_identity():
    root = Path(__file__).parents[1]
    ruleset = root / "fixtures" / "rulesets" / "clearlc-synthetic-ops-v1.json"
    actual = hashlib.sha256(ruleset.read_bytes()).hexdigest()
    manifest = json.loads((root / "fixtures" / "fixtures.json").read_text(encoding="utf-8"))
    assert actual == manifest["credit"]["ruleset_hash"]


def test_hero_case_is_explicitly_title_only_not_an_adverse_fixture():
    root = Path(__file__).parents[1]
    quality = (root / "fixtures" / "documents" / "quality-inspection-title-only.txt").read_text(encoding="utf-8")
    assert "Document title: Quality Inspection Certificate" in quality
    assert "Function: Certificate of Quality issued by an independent surveyor" in quality
    manifest = json.loads((root / "fixtures" / "fixtures.json").read_text(encoding="utf-8"))
    case = manifest["cases"]["CASE_B_INVALID_SEMANTIC_REFUSAL"]
    assert case["expected_decision"] == "INVALID_DISCREPANCY"
    assert case["expected_reason_code"] == "TITLE_ONLY_MISMATCH"

