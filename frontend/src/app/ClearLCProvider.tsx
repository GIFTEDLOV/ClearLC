import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { demoCaseList } from "../domain/demoFixture";
import { FixtureClearLCAdapter, LiveClearLCAdapter, type ClearLCAdapter, type WriteRequest } from "../domain/clearLcAdapter";
import type { ContractInfo, CreditReadModel, DemoSnapshot, RequirementReadModel, StoredTransaction } from "../domain/models";
import { BrowserTransactionJournal } from "../chain/transactionDiscipline";
import { connectWallet, emptyWalletSnapshot, readWalletSnapshot, type WalletSnapshot } from "../chain/wallet";

export interface CreditDraft {
  creditId: string;
  applicant: string;
  beneficiary: string;
  examiner: string;
  amount: number;
  currency: string;
  expiryAt: number;
  presentationDeadline: number;
  shipmentDeadline: number;
  rulesetId: string;
  rulesetHash: string;
  requirements: Array<Pick<RequirementReadModel, "requirement_id" | "document_type" | "required" | "authority_constraint" | "objective_constraints" | "semantic_clause" | "rule_reference">>;
}

interface ClearLCContextValue {
  mode: "DEMO" | "LIVE";
  setMode: (mode: "DEMO" | "LIVE") => void;
  adapter: ClearLCAdapter;
  credits: CreditReadModel[];
  snapshots: DemoSnapshot[];
  getSnapshot: (creditId: string) => DemoSnapshot | undefined;
  wallet: WalletSnapshot;
  connect: () => Promise<void>;
  transactions: StoredTransaction[];
  refresh: () => Promise<void>;
  runWrite: (request: WriteRequest) => Promise<StoredTransaction>;
  createCredit: (draft: CreditDraft) => Promise<StoredTransaction | undefined>;
  simulateRecovery: () => void;
  liveConfigured: boolean;
  liveError: string | null;
  liveRefreshing: boolean;
  contractInfo: ContractInfo | null;
}

const Context = createContext<ClearLCContextValue | undefined>(undefined);

function envMode(): "DEMO" | "LIVE" {
  return import.meta.env.VITE_CLEARLC_MODE === "LIVE" ? "LIVE" : "DEMO";
}

function envContractAddress(): string | undefined {
  return import.meta.env.VITE_CLEARLC_CONTRACT_ADDRESS || undefined;
}

function envContractSha256(): string | undefined {
  return import.meta.env.VITE_CLEARLC_CONTRACT_SHA256 || undefined;
}

function envReleaseMetadata() {
  return {
    deploymentTx: import.meta.env.VITE_CLEARLC_DEPLOYMENT_TX || undefined,
    runner: import.meta.env.VITE_CLEARLC_RUNNER || undefined,
    schemaMethodCount: import.meta.env.VITE_CLEARLC_SCHEMA_METHOD_COUNT ? Number(import.meta.env.VITE_CLEARLC_SCHEMA_METHOD_COUNT) : undefined,
    feeProfileCoverage: import.meta.env.VITE_CLEARLC_FEE_PROFILE_COVERAGE || undefined,
    feeProfileSha256: import.meta.env.VITE_CLEARLC_FEE_PROFILE_SHA256 || undefined
  };
}

function buildFixtureCredit(draft: CreditDraft): DemoSnapshot {
  const root = "0".repeat(64);
  const credit: CreditReadModel = {
    credit_id: draft.creditId,
    applicant: draft.applicant,
    beneficiary: draft.beneficiary,
    examiner: draft.examiner,
    amount: draft.amount,
    currency_label: draft.currency,
    expiry_at: draft.expiryAt,
    presentation_deadline: draft.presentationDeadline,
    shipment_deadline: draft.shipmentDeadline,
    ruleset_id: draft.rulesetId,
    ruleset_hash: draft.rulesetHash,
    active_version: 1,
    requirements_root: root,
    escrowed_amount: 0,
    status: "CREATED",
    settled: false,
    settlement_booked_amount: 0,
    frozen: false,
    current_presentation_id: "",
    latest_presentation_version: 0,
    settlement_recipient: "",
    active_cure_discrepancy_id: ""
  };
  return {
    case_id: draft.creditId,
    case_name: "New fixture credit",
    label: "DEMO FIXTURE · newly created",
    description: "A locally created fixture credit. It is not a live chain write.",
    current_time_at: Math.floor(Date.now() / 1000),
    credit,
    requirements: draft.requirements.map((requirement) => ({ ...requirement, credit_id: draft.creditId, credit_version: 1, resolution_status: "UNASSESSED" as const, settlement_eligible: false })),
    evidence: [],
    presentation: { presentation_id: "", credit_id: draft.creditId, credit_version: 1, version: 0, submitted_by: draft.beneficiary, submitted_at: 0, evidence_ids: [], requirements_root: root, status: "CREATED" },
    presentation_history: [],
    discrepancies: [],
    audit: [{ sequence: 1, action: "CREDIT_CREATED", actor: draft.applicant, subject_id: draft.creditId, at: Math.floor(Date.now() / 1000), detail: "Created in controlled fixture mode" }],
    contractInfo: { protocol: "ClearLC", version: "1.1.0-candidate", ruleset_family: draft.rulesetId, semantic_scope: "bounded semantic discrepancy; native GEN cash routing is deterministic", outgoing_gen_transfer_enabled: true, fund_flow: "Native GEN escrow exits exactly once to the beneficiary on deterministic settlement or to the applicant on funded expiry.", total_escrow_liability: 0, total_beneficiary_payouts: 0, total_applicant_refunds: 0, target_network: "demo fixture", provenance: "local v1.1.0 candidate fixture adapter", contract_sha256: "808c630d72223d11d58769b7c9261250357fe97e6426aa911aa7e1a8f2842a13" }
  };
}

export function ClearLCProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"DEMO" | "LIVE">(envMode);
  const [wallet, setWallet] = useState<WalletSnapshot>(emptyWalletSnapshot);
  const [snapshots, setSnapshots] = useState<DemoSnapshot[]>(() => envMode() === "LIVE" ? [] : demoCaseList);
  const [transactions, setTransactions] = useState<StoredTransaction[]>(() => envMode() === "LIVE" ? new BrowserTransactionJournal().list() : []);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const liveAdapter = useMemo(() => new LiveClearLCAdapter({ contractAddress: envContractAddress(), contractSha256: envContractSha256(), walletAddress: wallet.address, ...envReleaseMetadata() }), [wallet.address]);
  const fixtureAdapter = useMemo(() => new FixtureClearLCAdapter(demoCaseList), []);
  const adapter = mode === "LIVE" ? liveAdapter : fixtureAdapter;

  const changeMode = useCallback((nextMode: "DEMO" | "LIVE") => {
    setMode(nextMode);
    setSnapshots(nextMode === "DEMO" ? demoCaseList : []);
    setTransactions(nextMode === "LIVE" ? new BrowserTransactionJournal().list() : []);
    setLiveError(null);
    setContractInfo(null);
  }, []);

  const refresh = useCallback(async () => {
    if (mode === "DEMO") {
      setSnapshots((current) => current.length ? current : demoCaseList);
      setContractInfo(demoCaseList[0]?.contractInfo ?? null);
      return;
    }
    setLiveRefreshing(true);
    try {
      const info = await adapter.getContractInfo();
      if (!info) throw new Error("LIVE_CONTRACT_INFO_UNAVAILABLE");
      const credits = await adapter.listCredits();
      const liveSnapshots = await Promise.all(credits.map((credit) => adapter.getSnapshot(credit.credit_id)));
      setContractInfo(info);
      setSnapshots(liveSnapshots.filter((snapshot): snapshot is DemoSnapshot => Boolean(snapshot)));
      setLiveError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "LIVE_CANONICAL_READ_FAILED";
      setSnapshots([]);
      setLiveError(message);
      throw error;
    } finally {
      setLiveRefreshing(false);
    }
  }, [adapter, mode]);

  useEffect(() => {
    void readWalletSnapshot().then(setWallet).catch(() => setWallet(emptyWalletSnapshot));
  }, []);

  useEffect(() => {
    if (mode === "LIVE") void refresh().catch(() => undefined);
    else {
      setSnapshots(demoCaseList);
      setContractInfo(demoCaseList[0]?.contractInfo ?? null);
      setLiveError(null);
    }
  }, [mode, refresh]);

  useEffect(() => {
    if (mode !== "LIVE" || !adapter.recoverTransactions) return;
    void adapter.recoverTransactions().then(setTransactions).catch(() => undefined);
  }, [adapter, mode]);

  const connect = useCallback(async () => {
    setWallet(await connectWallet());
  }, []);

  const runWrite = useCallback(async (request: WriteRequest) => {
    const result = await adapter.performWrite(request);
    setTransactions((current) => [...current.filter((item) => item.tx_hash !== result.tx_hash), result]);
    if (mode === "LIVE") await refresh();
    return result;
  }, [adapter, mode, refresh]);

  const createCredit = useCallback(async (draft: CreditDraft) => {
    if (mode === "DEMO") {
      const snapshot = buildFixtureCredit(draft);
      setSnapshots((current) => [snapshot, ...current]);
      return undefined;
    }
    return runWrite({
      method: "create_credit",
      args: [draft.creditId, draft.applicant, draft.beneficiary, draft.examiner, BigInt(draft.amount), draft.currency, BigInt(draft.expiryAt), BigInt(draft.presentationDeadline), BigInt(draft.shipmentDeadline), draft.rulesetId, draft.rulesetHash],
      expectedPostcondition: "credit exists in canonical get_credit readback"
    });
  }, [mode, runWrite]);

  const simulateRecovery = useCallback(() => {
    if (mode !== "DEMO") return;
    const now = Date.now();
    setTransactions((current) => [...current, { tx_hash: "0xrecovered-demo" as `0x${string}`, network: "demo-fixture", chain_id: 0, contract: "fixture://clearlc", method: "adjudicate_discrepancy", credit_id: demoCaseList[1].credit.credit_id, submitted_at: now - 60000, expected_postcondition: "adjudication state readback", phase: "RECOVERED", last_observed_at: now }]);
  }, [mode]);

  const value: ClearLCContextValue = {
    mode,
    setMode: changeMode,
    adapter,
    credits: snapshots.map((snapshot) => snapshot.credit),
    snapshots,
    getSnapshot: (creditId) => snapshots.find((snapshot) => snapshot.credit.credit_id === creditId),
    wallet,
    connect,
    transactions,
    refresh,
    runWrite,
    createCredit,
    simulateRecovery,
    liveConfigured: liveAdapter.configured,
    liveError,
    liveRefreshing,
    contractInfo
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useClearLC(): ClearLCContextValue {
  const value = useContext(Context);
  if (!value) throw new Error("useClearLC must be used inside ClearLCProvider");
  return value;
}
