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
                '        self._require_caller(credit.applicant)\n        self._require_status(credit, (STATE_CREATED,))\n        _require(self._now() <= credit.expiry_at, "FUNDING_AFTER_EXPIRY")',
                '        self._require_caller(credit.beneficiary)\n        self._require_status(credit, (STATE_CREATED,))\n        _require(self._now() <= credit.expiry_at, "FUNDING_AFTER_EXPIRY")',
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
            source.replace(
                '            "SETTLEMENT_REQUIREMENTS_UNRESOLVED",\n',
                "            \"REMOVED_SETTLEMENT_REQUIREMENT_GATE\",\n",
                1,
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

    settle_start = source.index("    def settle_credit(")
    settle_end = source.index("    @gl.public.write\n    def expire_credit", settle_start)
    cash_settle = source[settle_start:settle_end]
    mutants.append(
        (
            "cash_payout_recipient_binding",
            _replace_once(source, "NativeRecipient(gl.Address(credit.beneficiary)).emit_transfer(value=credit.amount)", "NativeRecipient(gl.Address(credit.applicant)).emit_transfer(value=credit.amount)"),
            ["tests/test_cash_exit.py::test_zero_receiving_roles_are_rejected_and_cash_routing_is_not_caller_controlled"],
        )
    )
    mutants.append(
        (
            "cash_payout_amount_binding",
            _replace_once(source, "NativeRecipient(gl.Address(credit.beneficiary)).emit_transfer(value=credit.amount)", "NativeRecipient(gl.Address(credit.beneficiary)).emit_transfer(value=gl.u256(1))"),
            ["tests/test_cash_exit.py::test_zero_receiving_roles_are_rejected_and_cash_routing_is_not_caller_controlled"],
        )
    )
    mutants.append(
        (
            "cash_refund_recipient_binding",
            _replace_once(source, "NativeRecipient(gl.Address(credit.applicant)).emit_transfer(value=credit.escrowed_amount)", "NativeRecipient(gl.Address(credit.beneficiary)).emit_transfer(value=credit.escrowed_amount)"),
            ["tests/test_cash_exit.py::test_zero_receiving_roles_are_rejected_and_cash_routing_is_not_caller_controlled"],
        )
    )
    mutants.append(
        (
            "cash_refund_amount_binding",
            _replace_once(source, "NativeRecipient(gl.Address(credit.applicant)).emit_transfer(value=credit.escrowed_amount)", "NativeRecipient(gl.Address(credit.applicant)).emit_transfer(value=gl.u256(1))"),
            ["tests/test_cash_exit.py::test_zero_receiving_roles_are_rejected_and_cash_routing_is_not_caller_controlled"],
        )
    )
    cash_double_payout_segment = _replace_once(cash_settle, "        credit = self._active_credit(credit_id)\n", "        credit = self._credit(credit_id)\n")
    cash_double_payout_segment = _replace_once(cash_double_payout_segment, "        self._require_status(credit, (STATE_SETTLEMENT_READY,))\n", "        self._require_status(credit, (STATE_SETTLEMENT_READY, STATE_SETTLED))\n")
    cash_double_payout_segment = _replace_once(cash_double_payout_segment, "        self._require_cash_exit_clear(credit)\n", "        pass\n")
    cash_double_payout_segment = _replace_once(cash_double_payout_segment, "        _require(self.total_escrow_liability >= credit.amount, \"INSUFFICIENT_ESCROW_LIABILITY\")\n", "        _require(True, \"INSUFFICIENT_ESCROW_LIABILITY\")\n")
    cash_double_payout_segment = _replace_once(cash_double_payout_segment, "        self.total_escrow_liability = self.total_escrow_liability - credit.amount\n", "        self.total_escrow_liability = self.total_escrow_liability\n")
    cash_double_payout = source[:settle_start] + cash_double_payout_segment + source[settle_end:]
    mutants.append(("cash_double_payout", cash_double_payout, ["tests/test_cash_exit.py::test_beneficiary_payout_is_exactly_once_and_clears_liability"]))

    cash_double_refund = source
    refund_start = cash_double_refund.index("    def expire_credit(")
    refund_end = cash_double_refund.index("    @gl.public.write\n    def cancel_credit", refund_start)
    refund_segment = cash_double_refund[refund_start:refund_end]
    refund_segment = _replace_once(refund_segment, "        credit = self._active_credit(credit_id)\n", "        credit = self._credit(credit_id)\n")
    refund_segment = _replace_once(refund_segment, "        _require(credit.applicant_refunded_amount == gl.u256(0), \"APPLICANT_ALREADY_REFUNDED\")\n", "        pass\n")
    refund_segment = _replace_once(refund_segment, "        _require(credit.cash_exit_kind == CASH_EXIT_NONE, \"CASH_EXIT_ALREADY_COMPLETED\")\n", "        pass\n")
    mutants.append(("cash_double_refund", cash_double_refund[:refund_start] + refund_segment + cash_double_refund[refund_end:], ["tests/test_cash_exit.py::test_funded_expiry_automatically_refunds_applicant_exactly_once"]))

    cash_both_exits = source
    both_segment = cash_both_exits[refund_start:refund_end]
    both_segment = _replace_once(both_segment, "        credit = self._active_credit(credit_id)\n", "        credit = self._credit(credit_id)\n")
    both_segment = _replace_once(both_segment, "        _require(credit.status != STATE_SETTLED, \"CREDIT_ALREADY_SETTLED\")\n", "        pass\n")
    both_segment = _replace_once(both_segment, "        _require(credit.beneficiary_paid_amount == gl.u256(0), \"BENEFICIARY_ALREADY_PAID\")\n", "        pass\n")
    both_segment = _replace_once(both_segment, "        _require(credit.cash_exit_kind == CASH_EXIT_NONE, \"CASH_EXIT_ALREADY_COMPLETED\")\n", "        pass\n")
    cash_both_exits = cash_both_exits[:refund_start] + both_segment + cash_both_exits[refund_end:]
    mutants.append(("cash_payout_refund_mutual_exclusion", cash_both_exits, ["tests/test_cash_exit.py::test_beneficiary_payout_is_exactly_once_and_clears_liability"]))
    mutants.append(("cash_expiry_guard", _replace_once(source, '        _require(self._now() > credit.expiry_at, "CREDIT_NOT_EXPIRED")\n', "        pass\n"), ["tests/test_cash_exit.py::test_expiry_before_deadline_is_rejected"]))
    mutants.append(("cash_payout_balance_guard", _replace_once(source, '        _require(self.balance >= credit.amount, "INSUFFICIENT_CONTRACT_BALANCE")\n', "        pass\n"), ["tests/test_cash_exit.py::test_insolvency_and_liability_checks_fail_closed_without_state_change"]))
    mutants.append(("cash_payout_liability_guard", _replace_once(source, '        _require(self.total_escrow_liability >= credit.amount, "INSUFFICIENT_ESCROW_LIABILITY")\n', "        pass\n"), ["tests/test_cash_exit.py::test_insolvency_and_liability_checks_fail_closed_without_state_change"]))
    mutants.append(("cash_refund_balance_guard", _replace_once(source, '        _require(self.balance >= credit.escrowed_amount, "INSUFFICIENT_CONTRACT_BALANCE")\n', "        pass\n"), ["tests/test_cash_exit.py::test_refund_insolvency_fails_closed"]))
    mutants.append(("cash_refund_liability_guard", _replace_once(source, '        _require(self.total_escrow_liability >= credit.escrowed_amount, "INSUFFICIENT_ESCROW_LIABILITY")\n', "        pass\n"), ["tests/test_cash_exit.py::test_refund_insolvency_fails_closed"]))
    mutated_payout_clear = _replace_once(cash_settle, "        credit.escrowed_amount = gl.u256(0)\n", "        pass\n")
    mutants.append(("cash_clear_escrow", source[:settle_start] + mutated_payout_clear + source[settle_end:], ["tests/test_cash_exit.py::test_beneficiary_payout_is_exactly_once_and_clears_liability"]))
    mutants.append(("cash_decrement_liability", source[:settle_start] + _replace_once(cash_settle, "        self.total_escrow_liability = self.total_escrow_liability - credit.amount\n", "        pass\n") + source[settle_end:], ["tests/test_cash_exit.py::test_beneficiary_payout_is_exactly_once_and_clears_liability"]))
    mutants.append(("cash_refund_clear_escrow", source[:refund_start] + _replace_once(refund_segment, "        credit.escrowed_amount = gl.u256(0)\n", "        pass\n") + source[refund_end:], ["tests/test_cash_exit.py::test_funded_expiry_automatically_refunds_applicant_exactly_once"]))
    mutants.append(("cash_refund_decrement_liability", _replace_once(source, "        self.total_escrow_liability = self.total_escrow_liability - amount\n", "        pass\n"), ["tests/test_cash_exit.py::test_funded_expiry_automatically_refunds_applicant_exactly_once"]))
    mutants.append(("cash_funding_after_expiry", _replace_once(source, '        _require(self._now() <= credit.expiry_at, "FUNDING_AFTER_EXPIRY")\n', "        pass\n"), ["tests/test_cash_exit.py::test_funding_after_expiry_is_blocked"]))
    mutants.append(("cash_zero_address_guard", _replace_once(source, '    _require(value.lower() != "0x0000000000000000000000000000000000000000", field + "_ADDRESS_ZERO")\n', "    pass\n"), ["tests/test_cash_exit.py::test_zero_receiving_roles_are_rejected_and_cash_routing_is_not_caller_controlled"]))
    mutants.append(("cash_native_gen_guard", _replace_once(source, "        self._require_native_gen_credit(currency_label)\n", "        pass\n"), ["tests/test_cash_exit.py::test_zero_receiving_roles_are_rejected_and_cash_routing_is_not_caller_controlled"]))
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
