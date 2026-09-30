import { describe, expect, it } from "vitest";
import { BrowserTransactionJournal, STUDIO_DEV_CHAIN_ID, STUDIO_DEV_RPC, assertStudioDevNetwork, verifyCanonicalPostcondition } from "../chain/transactionDiscipline";
import { FixtureClearLCAdapter, LiveClearLCAdapter } from "./clearLcAdapter";
import { demoCases } from "./demoFixture";
import { buildSettlementGates, resolutionIsSettlementEligible, settlementGateSatisfied } from "./logic";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as unknown as Storage;
}

describe("ClearLC domain adapter and settlement logic", () => {
  it("derives all clean settlement gates from canonical rows", () => {
    const snapshot = demoCases.clean;
    const gates = buildSettlementGates(snapshot.credit, snapshot.presentation, snapshot.requirements, snapshot.discrepancies, snapshot.current_time_at);
    expect(settlementGateSatisfied(gates)).toBe(true);
    expect(gates.every((gate) => gate.passed)).toBe(true);
  });

  it("keeps invalid refusal distinct from waiver", () => {
    const snapshot = demoCases["invalid-refusal"];
    expect(snapshot.adjudication?.decision).toBe("INVALID_DISCREPANCY");
    expect(snapshot.discrepancies[0].status).toBe("INVALID_DISCREPANCY");
    expect(snapshot.discrepancies[0].status).not.toBe("WAIVED");
    expect(snapshot.requirements.find((item) => item.requirement_id === "REQ-QUAL")?.resolution_status).toBe("INVALID_DISCREPANCY");
  });

  it("preserves cure lineage and creates a new presentation tuple", () => {
    const snapshot = demoCases.cure;
    expect(snapshot.presentation_history).toHaveLength(2);
    expect(snapshot.presentation_history?.[0].presentation_id).toBe("PRES-CURE-1");
    expect(snapshot.presentation.presentation_id).toBe("PRES-CURE-2");
    expect(snapshot.evidence.some((item) => item.document_id === "DOC-QUAL-1" && item.version === 1)).toBe(true);
    expect(snapshot.evidence.some((item) => item.document_id === "DOC-QUAL-2" && item.version === 2)).toBe(true);
    expect(snapshot.discrepancies[0].status).toBe("CURED");
    expect(snapshot.requirements.find((item) => item.requirement_id === "REQ-QUAL")?.resolution_status).toBe("CURED");
    expect(snapshot.presentation_history?.[0].evidence_set_hash).not.toBe(snapshot.presentation.evidence_set_hash);
  });

  it("has no fixture fallback when live contract address is absent", async () => {
    const adapter = new LiveClearLCAdapter({});
    expect(adapter.configured).toBe(false);
    expect(await adapter.listCredits()).toEqual([]);
    expect(await adapter.getSnapshot("CLC-COCOA-ROT-001")).toBeNull();
    const fixture = new FixtureClearLCAdapter(Object.values(demoCases));
    expect(fixture.sourceLabel).toContain("fixture");
  });

  it("enforces the Studio-dev network guard", () => {
    expect(() => assertStudioDevNetwork({ chain: { id: STUDIO_DEV_CHAIN_ID, rpcUrls: { default: { http: [STUDIO_DEV_RPC] } } }, estimateTransactionFeesForWrite: async () => ({ distribution: {}, feeValue: 0n }), writeContract: async () => "0xhash", waitForFinalization: async () => ({}) })).not.toThrow();
    expect(() => assertStudioDevNetwork({ chain: { id: 61999, rpcUrls: { default: { http: ["https://studionet.genlayer.com/api"] } } }, estimateTransactionFeesForWrite: async () => ({ distribution: {}, feeValue: 0n }), writeContract: async () => "0xhash", waitForFinalization: async () => ({}) })).toThrow("CLEARLC_NETWORK_GUARD_FAILED");
  });

  it("persists exact hashes and supports refresh-safe recovery records", async () => {
    const journal = new BrowserTransactionJournal(storage());
    await journal.persistSubmittedHash("0xabc", { address: "0xcontract", functionName: "challenge_discrepancy", args: ["DISC-1"] }, 12n);
    expect(journal.list()[0]).toMatchObject({ tx_hash: "0xabc", method: "challenge_discrepancy", phase: "SUBMITTED" });
    journal.update("0xabc", "RECOVERED");
    expect(journal.unresolved()[0].phase).toBe("RECOVERED");
  });

  it("does not leak transaction records across live contract scopes", async () => {
    const shared = storage();
    const first = new BrowserTransactionJournal(shared, { network: "studio-dev", chain_id: 61997, contract: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
    const second = new BrowserTransactionJournal(shared, { network: "studio-dev", chain_id: 61997, contract: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" });
    await first.persistSubmittedHash("0xfirst", { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", functionName: "settle_credit" }, 1n);
    await second.persistSubmittedHash("0xsecond", { address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", functionName: "settle_credit" }, 1n);
    expect(first.list().map((item) => item.tx_hash)).toEqual(["0xfirst"]);
    expect(second.list().map((item) => item.tx_hash)).toEqual(["0xsecond"]);
  });

  it("fails closed when canonical state does not satisfy the expected postcondition", () => {
    expect(() => verifyCanonicalPostcondition({ status: "PRESENTED" }, (value) => value.status === "SETTLED")).toThrow("STATE_VERIFICATION_FAILED");
    expect(resolutionIsSettlementEligible("INCONCLUSIVE")).toBe(false);
  });
});
