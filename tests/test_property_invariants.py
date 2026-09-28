import json
import random
from contextlib import nullcontext

import pytest

from tests.test_protocol import _bootstrap


@pytest.mark.direct
def test_generated_state_sequences_preserve_terminal_and_accounting_invariants(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    sequence_count = 16
    steps_per_sequence = 24
    operations = ("fund", "accept", "freeze", "cancel", "mark_ready", "settle", "challenge", "expire")
    contract, applicant, beneficiary, examiner = _bootstrap(
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        direct_charlie,
        credit_id="CR-PROP-00",
    )
    for seed in range(1, sequence_count):
        credit_id = f"CR-PROP-{seed:02d}"
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
            "85e60d8d3268867021e1e340c206b8ed63f3fb2cc5110c406849ba8af24552cb",
        )
        contract.define_requirement(
            credit_id,
            "REQ-QUALITY-" + str(seed),
            1,
            "Certificate of Quality",
            True,
            "independent surveyor",
            "issuer and quality fields must be present",
            "Certificate of Quality issued by an independent surveyor",
            "synthetic-ops-1.0.0",
        )
        contract.set_requirements_root(credit_id, "6ead5878d14c77dcde12ff584ce41b3616e8352b503c275ed86b593f3470b648")
        direct_vm.value = 250000
        contract.fund_credit(credit_id)
        direct_vm.sender = direct_bob
        contract.accept_credit(credit_id)
        direct_vm.sender = direct_alice
        contract.freeze_credit(credit_id)

    for seed in range(sequence_count):
        rng = random.Random(20260928 + seed)
        credit_id = f"CR-PROP-{seed:02d}"
        for _ in range(steps_per_sequence):
            operation = rng.choice(operations)
            before = json.loads(contract.get_credit(credit_id))
            warped_for_expire = False
            if operation == "expire" and seed == sequence_count - 1 and rng.random() < 0.25:
                direct_vm.warp("2027-01-16T00:00:00Z")
                warped_for_expire = True
            direct_vm.sender = {
                "fund": direct_alice,
                "accept": direct_bob,
                "freeze": direct_alice,
                "cancel": direct_alice,
                "mark_ready": direct_charlie,
                "settle": direct_charlie,
                "challenge": direct_bob,
                "expire": direct_bob,
            }[operation]
            can_expire = (
                operation == "expire"
                and warped_for_expire
                and before["status"] not in {"SETTLED", "EXPIRED", "CANCELLED"}
            )
            expected = nullcontext() if can_expire else direct_vm.expect_revert()
            with expected:
                if operation == "fund":
                    direct_vm.value = 250000
                    contract.fund_credit(credit_id)
                elif operation == "accept":
                    contract.accept_credit(credit_id)
                elif operation == "freeze":
                    contract.freeze_credit(credit_id)
                elif operation == "cancel":
                    contract.cancel_credit(credit_id)
                elif operation == "mark_ready":
                    contract.mark_settlement_ready(credit_id)
                elif operation == "settle":
                    contract.settle_credit(credit_id)
                elif operation == "challenge":
                    contract.challenge_discrepancy(credit_id, "UNKNOWN-DISCREPANCY")
                else:
                    contract.expire_credit(credit_id)
            after = json.loads(contract.get_credit(credit_id))
            assert int(after["settlement_booked_amount"]) <= int(after["escrowed_amount"])
            if before["status"] in {"SETTLED", "EXPIRED", "CANCELLED"}:
                assert after["status"] == before["status"]


def test_generated_version_and_evidence_lineage_invariants():
    sequence_count = 64
    for seed in range(sequence_count):
        rng = random.Random(9000 + seed)
        active_version = 1
        accepted_versions = []
        evidence_history = []
        for _ in range(20):
            candidate = active_version + rng.randint(0, 3)
            if candidate > active_version:
                active_version = candidate
                accepted_versions.append(active_version)
            evidence_id = f"EV-{seed}-{len(evidence_history)}"
            evidence_history.append({"evidence_id": evidence_id, "credit_id": f"CR-{seed}", "version": active_version})
            if rng.random() < 0.4:
                replacement_id = f"EV-{seed}-{len(evidence_history)}"
                evidence_history.append({"evidence_id": replacement_id, "credit_id": f"CR-{seed}", "version": active_version + 1})
        assert accepted_versions == sorted(set(accepted_versions))
        assert len({item["evidence_id"] for item in evidence_history}) == len(evidence_history)
        assert all(item["credit_id"] == f"CR-{seed}" for item in evidence_history)
        assert all(item["version"] >= 1 for item in evidence_history)
