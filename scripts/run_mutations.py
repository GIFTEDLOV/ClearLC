"""Run a small, deterministic mutation gate over ClearLC security checks.

Each mutant is deliberately narrow (or removes a coupled pair of guards when
the invariant is jointly enforced). A mutant is killed when its selected
ClearLC test selector fails. This script writes only into a temporary
directory and never changes the repository contract.
"""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "contracts" / "clearlc.py"


def _replace_once(source: str, old: str, new: str) -> str:
    if source.count(old) != 1:
        raise RuntimeError(f"mutation pattern must occur once: {old!r} ({source.count(old)})")
    return source.replace(old, new, 1)


def _settle_segment(source: str) -> str:
    start = source.index("    def settle_credit(")
    end = source.index("    @gl.public.write\n    def expire_credit", start)
    return source[start:end]


def _mutants(source: str) -> list[tuple[str, str, list[str]]]:
    mutants: list[tuple[str, str, list[str]]] = []
    mutants.append(
        (
            "authorization_fund",
            _replace_once(
                source,
                '        self._require_caller(credit.applicant)\n        self._require_status(credit, (STATE_CREATED,))\n        _require(gl.message.value == credit.amount, "FUNDING_AMOUNT_MISMATCH")',
                '        self._require_caller(credit.beneficiary)\n        self._require_status(credit, (STATE_CREATED,))\n        _require(gl.message.value == credit.amount, "FUNDING_AMOUNT_MISMATCH")',
            ),
            ["tests/test_phase2_protocol.py::test_payable_funding_rejects_wrong_actor_and_all_non_exact_values"],
        )
    )
    settle = _settle_segment(source)
    mutated_settle = _replace_once(
        settle,
        '        credit = self._active_credit(credit_id)\n',
        '        credit = self._credit(credit_id)\n',
    )
    mutated_settle = _replace_once(
        mutated_settle,
        '        self._require_status(credit, (STATE_SETTLEMENT_READY,))\n',
        '        self._require_status(credit, (STATE_SETTLEMENT_READY, STATE_SETTLED))\n',
    )
    mutated_settle = _replace_once(
        mutated_settle,
        '        _require(credit.settlement_booked_amount == gl.u256(0), "DOUBLE_SETTLEMENT")\n',
        '        _require(True, "DOUBLE_SETTLEMENT")\n',
    )
    mutants.append(
        (
            "double_settlement",
            source.replace(settle, mutated_settle, 1),
            ["tests/test_protocol.py::test_clean_presentation_reaches_settlement_and_cannot_double_settle"],
        )
    )
    mutants.append(
        (
            "expiry_settlement",
            _replace_once(
                source,
                '        _require(self._now() <= credit.expiry_at, "SETTLEMENT_AFTER_EXPIRY")\n        _require(credit.settlement_booked_amount == gl.u256(0), "DOUBLE_SETTLEMENT")',
                '        _require(True, "SETTLEMENT_AFTER_EXPIRY")\n        _require(credit.settlement_booked_amount == gl.u256(0), "DOUBLE_SETTLEMENT")',
            ),
            ["tests/test_phase2_protocol.py::test_settlement_after_expiry_and_cancelled_terminal_credit_are_blocked"],
        )
    )
    mutants.append(
        (
            "credit_version_binding",
            _replace_once(
                source,
                '        _require(credit_version == credit.active_version, "EVIDENCE_VERSION_NOT_ACTIVE")',
                '        _require(True, "EVIDENCE_VERSION_NOT_ACTIVE")',
            ),
            ["tests/test_phase2_protocol.py::test_wrong_version_and_cross_credit_document_reuse_are_rejected"],
        )
    )
    mutants.append(
        (
            "semantic_id_validation",
            _replace_once(
                _replace_once(source, '    _require(payload["requirement_id"] == requirement_id, "SEMANTIC_REQUIREMENT_MISMATCH")\n', ""),
                '    _require(payload["discrepancy_id"] == discrepancy_id, "SEMANTIC_DISCREPANCY_MISMATCH")\n',
                "",
            ),
            ["tests/test_adversarial_surface.py::test_critical_security_sentinels_remain_in_the_contract"],
        )
    )
    mutants.append(
        (
            "evidence_credit_binding",
            source.replace(
                '            _require(evidence.credit_id == credit_id, "CROSS_CREDIT_EVIDENCE")\n',
                "            pass\n",
            ),
            ["tests/test_adversarial_surface.py::test_critical_security_sentinels_remain_in_the_contract"],
        )
    )
    mutants.append(
        (
            "fingerprint_presentation_binding",
            _replace_once(
                source,
                '            + "|presentation="\n            + presentation.presentation_id\n',
                "",
            ),
            ["tests/test_adversarial_surface.py::test_critical_security_sentinels_remain_in_the_contract"],
        )
    )
    mutants.append(
        (
            "required_settlement_gate",
            _replace_once(
                source,
                '            "SETTLEMENT_REQUIREMENTS_UNRESOLVED",\n',
                "            \"REMOVED_SETTLEMENT_REQUIREMENT_GATE\",\n",
            ),
            ["tests/test_adversarial_surface.py::test_critical_security_sentinels_remain_in_the_contract"],
        )
    )
    mutants.append(
        (
            "waiver_authorization",
            _replace_once(
                source,
                '        self._require_caller(credit.applicant)\n        self._require_status(credit, (STATE_DISCREPANT, STATE_REVIEW_REQUIRED))',
                '        self._require_caller(credit.beneficiary)\n        self._require_status(credit, (STATE_DISCREPANT, STATE_REVIEW_REQUIRED))',
            ),
            ["tests/test_phase2_protocol.py::test_valid_semantic_discrepancy_can_be_waived_without_rewriting_adjudication"],
        )
    )
    return mutants


def main() -> int:
    source = SOURCE.read_text(encoding="utf-8")
    results: list[tuple[str, bool]] = []
    with tempfile.TemporaryDirectory(prefix="clearlc-mutants-") as temp:
        temp_root = Path(temp)
        for name, mutated_source, selectors in _mutants(source):
            mutant_path = temp_root / f"clearlc_{name}.py"
            mutant_path.write_text(mutated_source, encoding="utf-8")
            env = os.environ.copy()
            env["CLEARLC_CONTRACT_PATH"] = str(mutant_path)
            mutation_artifacts = ROOT / ".forensics" / "mutation-artifacts"
            command = [
                sys.executable,
                "-m",
                "pytest",
                "-q",
                *selectors,
                "--disable-warnings",
                "--maxfail=1",
                "--artifacts-dir",
                str(mutation_artifacts),
            ]
            completed = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
            killed = completed.returncode != 0
            results.append((name, killed))
            print(f"{name}: {'KILLED' if killed else 'SURVIVED'}")
            if not killed:
                print(completed.stdout[-1200:])
                print(completed.stderr[-1200:])
    killed_count = sum(killed for _, killed in results)
    survived_count = len(results) - killed_count
    print(f"MUTANTS_TOTAL={len(results)}")
    print(f"MUTANTS_KILLED={killed_count}")
    print(f"MUTANTS_SURVIVED={survived_count}")
    print(f"CRITICAL_MUTANTS_SURVIVED={survived_count}")
    return 0 if survived_count == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
