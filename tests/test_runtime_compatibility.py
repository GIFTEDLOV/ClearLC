"""ClearLC Studio-dev 5jyc runtime compatibility guards.

Studio-dev rejected the former 1jb descriptor before Python execution. The
5jyc source/API surface was then proven through hosted schema and deploy
simulation, so these checks keep the canonical source on that exact surface.
"""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "clearlc.py"
QUALIFIER = ROOT / "scripts" / "qualify-studio-dev.ts"
RUNNER = "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng"
DESCRIPTOR = f'# {{ "Depends": "{RUNNER}" }}'


def test_canonical_5jyc_descriptor_and_blank_line() -> None:
    lines = CONTRACT.read_text(encoding="utf-8").splitlines()
    assert lines[0] == DESCRIPTOR
    assert lines[1] == ""


def test_canonical_5jyc_import_and_contract_base() -> None:
    source = CONTRACT.read_text(encoding="utf-8")
    assert "import genlayer as gl" in source
    assert "from genlayer import *" not in source
    assert "class ClearLC(gl.contract.Contract):" in source
    assert "class ClearLC(gl.Contract):" not in source


def test_canonical_5jyc_storage_namespace() -> None:
    source = CONTRACT.read_text(encoding="utf-8")
    assert source.count("@gl.storage.allow") == 9
    assert "@allow_storage" not in source
    assert not re.search(r"(?<![\w.])u256\b", source)
    assert not re.search(r"(?<![\w.])DynArray\b", source)
    assert not re.search(r"(?<![\w.])TreeMap\b", source)


def test_qualification_uses_hosted_source_schema_method() -> None:
    qualifier = QUALIFIER.read_text(encoding="utf-8")
    assert 'HOSTED_SCHEMA_FOR_CODE_METHOD = "gen_getContractSchemaForCode"' in qualifier
    assert "method: HOSTED_SCHEMA_FOR_CODE_METHOD" in qualifier


def test_now_uses_deterministic_5jyc_clock_and_preserves_second_boundaries() -> None:
    source = CONTRACT.read_text(encoding="utf-8")
    now_start = source.index("    def _now")
    now_end = source.index("    def _credit", now_start)
    now_body = source[now_start:now_end]

    assert "datetime.now(timezone.utc).timestamp()" in now_body
    assert "return gl.u256(int(" in now_body
    assert "gl.message_raw" not in now_body

    # These operators are the protocol's Unix-second boundary contract:
    # equality is valid through deadlines, while expiry requires strictly >.
    assert "_require(submitted_at <= credit.presentation_deadline" in source
    assert "_require(self._now() <= credit.presentation_deadline" in source
    assert "_require(self._now() <= credit.expiry_at" in source
    assert "_require(self._now() > credit.expiry_at" in source

    expiry = 1_800_000_000
    assert expiry - 1 < expiry
    assert expiry == expiry
    assert expiry + 1 > expiry


def test_cure_has_no_implicit_time_window() -> None:
    source = CONTRACT.read_text(encoding="utf-8")
    cure_start = source.index("    def open_cure")
    cure_end = source.index("    def mark_settlement_ready", cure_start)
    cure_body = source[cure_start:cure_end]
    assert "_now()" not in cure_body
    assert "CURE_ALREADY_OPEN" in cure_body
