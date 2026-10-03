"""Direct cash-safety coverage for the v1.1 native GEN lifecycle."""

import json
import os
from pathlib import Path

import pytest

from tests.test_protocol import _bootstrap, _commit_quality


RULESET_HASH = "85e60d8d3268867021e1e340c206b8ed63f3fb2cc5110c406849ba8af24552cb"
ZERO = "0x0000000000000000000000000000000000000000"


def _source_path() -> str:
    return os.environ.get("CLEARLC_CONTRACT_PATH", "contracts/clearlc.py")


def _ready_for_payout(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, credit_id):
    contract, applicant, beneficiary, examiner = _bootstrap(
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        direct_charlie,
        credit_id=credit_id,
    )
    _commit_quality(contract, direct_vm, direct_bob, credit_id=credit_id, presentation_id="PRES-" + credit_id)
    direct_vm.sender = direct_charlie
    contract.begin_examination(credit_id, "PRES-" + credit_id)
    contract.record_requirement_check(credit_id, "PRES-" + credit_id, "REQ-QUALITY", "SATISFIED", "EV-QUALITY-1", "")
    contract.finalize_examination(credit_id, "PRES-" + credit_id)
    contract.mark_settlement_ready(credit_id)
    return contract, applicant, beneficiary, examiner


def _cash(contract, credit_id):
    return json.loads(contract.get_cash_accounting(credit_id))


@pytest.mark.direct
def test_funding_increases_liability_and_native_gen_is_explicit(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, _, _, _ = _bootstrap(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, credit_id="CR-CASH-FUND")
    credit = _cash(contract, "CR-CASH-FUND")
    assert credit["amount"] == "250000"
    assert credit["escrowed_amount"] == "250000"
    assert credit["total_escrow_liability"] == "250000"
    assert credit["beneficiary_paid_amount"] == "0"
    assert credit["applicant_refunded_amount"] == "0"
    assert credit["cash_exit_kind"] == "NONE"
    assert credit["status"] == "PRESENTATION_OPEN"


@pytest.mark.direct
def test_funding_after_expiry_is_blocked(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = direct_deploy(_source_path())
    direct_vm.warp("2025-12-01T00:00:00Z")
    from tests.test_protocol import _install_direct_nondet_patch
    _install_direct_nondet_patch()
    try:
        from genlayer.py.types import Address
    except ModuleNotFoundError:
        from genlayer.types import Address
    applicant = str(Address(direct_alice))
    beneficiary = str(Address(direct_bob))
    examiner = str(Address(direct_charlie))
    direct_vm.sender = direct_alice
    contract.create_credit("CR-CASH-LATE", applicant, beneficiary, examiner, 250000, "GEN", 1800000000, 1790000000, 1780000000, "clearlc-synthetic-ops", RULESET_HASH)
    direct_vm.warp("2027-01-16T00:00:01Z")
    direct_vm.value = 250000
    with direct_vm.expect_revert("FUNDING_AFTER_EXPIRY"):
        contract.fund_credit("CR-CASH-LATE")


@pytest.mark.direct
def test_beneficiary_payout_is_exactly_once_and_clears_liability(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, _, beneficiary, _ = _ready_for_payout(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, "CR-CASH-PAYOUT")
    direct_vm.sender = direct_charlie
    contract.settle_credit("CR-CASH-PAYOUT")
    cash = _cash(contract, "CR-CASH-PAYOUT")
    assert cash["escrowed_amount"] == "0"
    assert cash["settlement_booked_amount"] == "250000"
    assert cash["beneficiary_paid_amount"] == "250000"
    assert cash["applicant_refunded_amount"] == "0"
    assert cash["cash_exit_recipient"] == beneficiary
    assert cash["cash_exit_kind"] == "BENEFICIARY_PAYOUT"
    assert cash["total_escrow_liability"] == "0"
    assert cash["total_beneficiary_payouts"] == "250000"
    assert cash["total_applicant_refunds"] == "0"
    assert cash["status"] == "SETTLED"
    assert "BENEFICIARY_PAYOUT_EMITTED" in contract.get_audit_events("CR-CASH-PAYOUT")
    with direct_vm.expect_revert("CREDIT_TERMINAL"):
        contract.settle_credit("CR-CASH-PAYOUT")
    direct_vm.warp("2027-01-16T00:00:01Z")
    with direct_vm.expect_revert("CREDIT_TERMINAL"):
        contract.expire_credit("CR-CASH-PAYOUT")


@pytest.mark.direct
def test_funded_expiry_automatically_refunds_applicant_exactly_once(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, applicant, _, _ = _ready_for_payout(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, "CR-CASH-REFUND")
    direct_vm.warp("2027-01-16T00:00:01Z")
    contract.expire_credit("CR-CASH-REFUND")
    cash = _cash(contract, "CR-CASH-REFUND")
    assert cash["escrowed_amount"] == "0"
    assert cash["settlement_booked_amount"] == "0"
    assert cash["beneficiary_paid_amount"] == "0"
    assert cash["applicant_refunded_amount"] == "250000"
    assert cash["cash_exit_recipient"] == applicant
    assert cash["cash_exit_kind"] == "APPLICANT_REFUND"
    assert cash["total_escrow_liability"] == "0"
    assert cash["total_beneficiary_payouts"] == "0"
    assert cash["total_applicant_refunds"] == "250000"
    assert cash["status"] == "REFUNDED"
    assert "APPLICANT_EXPIRY_REFUND_EMITTED" in contract.get_audit_events("CR-CASH-REFUND")
    with direct_vm.expect_revert("CREDIT_TERMINAL"):
        contract.expire_credit("CR-CASH-REFUND")
    with direct_vm.expect_revert("CREDIT_TERMINAL"):
        contract.settle_credit("CR-CASH-REFUND")


@pytest.mark.direct
def test_unfunded_expiry_is_no_value_expired_state(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = direct_deploy(_source_path())
    from tests.test_protocol import _install_direct_nondet_patch
    _install_direct_nondet_patch()
    try:
        from genlayer.py.types import Address
    except ModuleNotFoundError:
        from genlayer.types import Address
    applicant = str(Address(direct_alice))
    beneficiary = str(Address(direct_bob))
    examiner = str(Address(direct_charlie))
    direct_vm.warp("2025-12-01T00:00:00Z")
    direct_vm.sender = direct_alice
    contract.create_credit("CR-CASH-EMPTY", applicant, beneficiary, examiner, 250000, "GEN", 1800000000, 1790000000, 1780000000, "clearlc-synthetic-ops", RULESET_HASH)
    direct_vm.warp("2027-01-16T00:00:01Z")
    contract.expire_credit("CR-CASH-EMPTY")
    cash = _cash(contract, "CR-CASH-EMPTY")
    assert cash["status"] == "EXPIRED"
    assert cash["cash_exit_kind"] == "NONE"
    assert cash["total_escrow_liability"] == "0"


@pytest.mark.direct
def test_expiry_before_deadline_is_rejected(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, _, _, _ = _bootstrap(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, credit_id="CR-CASH-EARLY")
    with direct_vm.expect_revert("CREDIT_NOT_EXPIRED"):
        contract.expire_credit("CR-CASH-EARLY")


@pytest.mark.direct
def test_insolvency_and_liability_checks_fail_closed_without_state_change(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, _, _, _ = _ready_for_payout(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, "CR-CASH-SOLVENCY")
    direct_vm.deal(direct_vm._contract_address, 0)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("INSUFFICIENT_CONTRACT_BALANCE"):
        contract.settle_credit("CR-CASH-SOLVENCY")
    assert _cash(contract, "CR-CASH-SOLVENCY")["status"] == "SETTLEMENT_READY"

    direct_vm.deal(direct_vm._contract_address, 250000)
    contract.total_escrow_liability = 0
    with direct_vm.expect_revert("INSUFFICIENT_ESCROW_LIABILITY"):
        contract.settle_credit("CR-CASH-SOLVENCY")
    cash = _cash(contract, "CR-CASH-SOLVENCY")
    assert cash["status"] == "SETTLEMENT_READY"
    assert cash["escrowed_amount"] == "250000"
    assert cash["beneficiary_paid_amount"] == "0"


@pytest.mark.direct
def test_refund_insolvency_fails_closed(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract, _, _, _ = _bootstrap(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, credit_id="CR-CASH-REFUND-SOLVENCY")
    direct_vm.warp("2027-01-16T00:00:01Z")
    direct_vm.deal(direct_vm._contract_address, 0)
    with direct_vm.expect_revert("INSUFFICIENT_CONTRACT_BALANCE"):
        contract.expire_credit("CR-CASH-REFUND-SOLVENCY")
    assert _cash(contract, "CR-CASH-REFUND-SOLVENCY")["status"] == "PRESENTATION_OPEN"
    direct_vm.deal(direct_vm._contract_address, 250000)
    contract.total_escrow_liability = 0
    with direct_vm.expect_revert("INSUFFICIENT_ESCROW_LIABILITY"):
        contract.expire_credit("CR-CASH-REFUND-SOLVENCY")


@pytest.mark.direct
def test_zero_receiving_roles_are_rejected_and_cash_routing_is_not_caller_controlled(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = direct_deploy(_source_path())
    from tests.test_protocol import _install_direct_nondet_patch
    _install_direct_nondet_patch()
    try:
        from genlayer.py.types import Address
    except ModuleNotFoundError:
        from genlayer.types import Address

    applicant = str(Address(direct_alice))
    beneficiary = str(Address(direct_bob))
    examiner = str(Address(direct_charlie))
    direct_vm.warp("2025-12-01T00:00:00Z")
    direct_vm.sender = bytes(20)
    with direct_vm.expect_revert("APPLICANT_ADDRESS_ZERO"):
        contract.create_credit("CR-CASH-ZERO-APPLICANT", ZERO, beneficiary, examiner, 250000, "GEN", 1800000000, 1790000000, 1780000000, "clearlc-synthetic-ops", RULESET_HASH)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("BENEFICIARY_ADDRESS_ZERO"):
        contract.create_credit("CR-CASH-ZERO-BENEFICIARY", applicant, ZERO, examiner, 250000, "GEN", 1800000000, 1790000000, 1780000000, "clearlc-synthetic-ops", RULESET_HASH)
    with direct_vm.expect_revert("NATIVE_GEN_ONLY"):
        contract.create_credit("CR-CASH-NON-GEN", applicant, beneficiary, examiner, 250000, "USD", 1800000000, 1790000000, 1780000000, "clearlc-synthetic-ops", RULESET_HASH)

    source = Path(_source_path()).read_text(encoding="utf-8")
    settle = source[source.index("    def settle_credit("):source.index("    @gl.public.write\n    def expire_credit", source.index("    def settle_credit("))]
    assert "def settle_credit(self, credit_id: str)" in settle
    assert "NativeRecipient(gl.Address(credit.beneficiary)).emit_transfer(value=credit.amount)" in settle
    expire = source[source.index("    def expire_credit("):source.index("    @gl.public.write\n    def cancel_credit", source.index("    def expire_credit("))]
    assert "NativeRecipient(gl.Address(credit.applicant)).emit_transfer(value=credit.escrowed_amount)" in expire
    assert "credit.escrowed_amount = gl.u256(0)" in settle
    assert "self.total_escrow_liability = self.total_escrow_liability - credit.amount" in settle
    assert "self.total_escrow_liability = self.total_escrow_liability - amount" in expire
    assert "gl.message.sender_address" not in settle
    assert "amount: gl.u256" not in settle
    assert "recipient: str" not in settle
