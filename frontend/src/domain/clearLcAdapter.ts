import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import type { ContractCreditWire, ContractInfoWire } from "./contractAdapter";
import { adaptAdjudication, adaptAuditEvent, adaptContractInfo, adaptCredit, adaptDiscrepancy, adaptEvidence, adaptPresentation, adaptRequirement } from "./contractAdapter";
import type { ContractAdjudicationWire, ContractDiscrepancyWire, ContractEvidenceWire, ContractPresentationWire, ContractRequirementWire } from "./contractAdapter";
import type { AppMode, ContractInfo, CreditReadModel, DemoSnapshot, DiscrepancyReadModel, RequirementReadModel, StoredTransaction } from "./models";
import { BrowserTransactionJournal, submitOnceAndReconcile, verifyCanonicalPostcondition, type StudioDevClientLike, type TransactionObserver, type WriteCall } from "../chain/transactionDiscipline";

export interface WriteRequest {
  method: string;
  args: readonly unknown[];
  value?: bigint;
  creditId?: string;
  expectedPostcondition: string;
  verify?: (snapshot: DemoSnapshot | null) => boolean;
}

export interface ClearLCAdapter {
  readonly mode: AppMode;
  readonly sourceLabel: string;
  readonly configured: boolean;
  listCredits(): Promise<CreditReadModel[]>;
  getSnapshot(creditId: string): Promise<DemoSnapshot | null>;
  getContractInfo(): Promise<ContractInfo | null>;
  performWrite(request: WriteRequest, observer?: TransactionObserver): Promise<StoredTransaction>;
  recoverTransactions?(): Promise<StoredTransaction[]>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class FixtureClearLCAdapter implements ClearLCAdapter {
  readonly mode = "DEMO" as const;
  readonly sourceLabel = "Controlled deterministic fixture";
  readonly configured = true;
  private readonly snapshots: Map<string, DemoSnapshot>;

  constructor(initialSnapshots: DemoSnapshot[]) {
    this.snapshots = new Map(initialSnapshots.map((snapshot) => [snapshot.credit.credit_id, clone(snapshot)]));
  }

  async listCredits(): Promise<CreditReadModel[]> {
    return [...this.snapshots.values()].map((snapshot) => clone(snapshot.credit));
  }

  async getSnapshot(creditId: string): Promise<DemoSnapshot | null> {
    const snapshot = this.snapshots.get(creditId);
    return snapshot ? clone(snapshot) : null;
  }

  async getContractInfo(): Promise<ContractInfo> {
    const first = this.snapshots.values().next().value as DemoSnapshot | undefined;
    return clone(first?.contractInfo ?? {
      protocol: "ClearLC",
      version: "fixture",
      ruleset_family: "synthetic",
      semantic_scope: "fixture",
      outgoing_gen_transfer_enabled: false,
      target_network: "demo fixture",
      provenance: "controlled fixture"
    });
  }

  async performWrite(request: WriteRequest): Promise<StoredTransaction> {
    const hash = "0xfixture" + request.method.toLowerCase() + Date.now().toString(16);
    return {
      tx_hash: hash as StoredTransaction["tx_hash"],
      network: "demo-fixture",
      chain_id: 0,
      contract: "fixture://clearlc",
      method: request.method,
      credit_id: request.creditId,
      submitted_at: Date.now(),
      expected_postcondition: request.expectedPostcondition,
      phase: "COMPLETE",
      last_observed_at: Date.now()
    };
  }

  async recoverTransactions(): Promise<StoredTransaction[]> {
    return [];
  }
}

export interface LiveAdapterConfig {
  contractAddress?: string;
  walletAddress?: string;
}

function parseJson<T>(raw: unknown): T {
  if (typeof raw === "string") return JSON.parse(raw) as T;
  return raw as T;
}

export class LiveClearLCAdapter implements ClearLCAdapter {
  readonly mode = "LIVE" as const;
  readonly sourceLabel = "Studio-dev canonical read model";
  readonly configured: boolean;
  private readonly contractAddress?: string;
  private readonly readClient;
  private walletAddress?: string;

  constructor(config: LiveAdapterConfig) {
    this.contractAddress = config.contractAddress && /^0x[0-9a-fA-F]{40}$/.test(config.contractAddress) ? config.contractAddress : undefined;
    this.walletAddress = config.walletAddress && /^0x[0-9a-fA-F]{40}$/.test(config.walletAddress) ? config.walletAddress : undefined;
    this.configured = Boolean(this.contractAddress);
    this.readClient = createClient({ chain: studioDevnet });
  }

  setWalletAddress(address?: string): void {
    this.walletAddress = address && /^0x[0-9a-fA-F]{40}$/.test(address) ? address : undefined;
  }

  private ensureConfigured(): string {
    if (!this.contractAddress) throw new Error("LIVE_CONTRACT_ADDRESS_NOT_CONFIGURED");
    return this.contractAddress;
  }

  private async read(functionName: string, args: readonly unknown[] = []): Promise<unknown> {
    return this.readClient.readContract({ address: this.ensureConfigured() as never, functionName, args: args as never[] });
  }

  async getContractInfo(): Promise<ContractInfo | null> {
    if (!this.configured) return null;
    return adaptContractInfo(parseJson<ContractInfoWire>(await this.read("contract_info")));
  }

  async listCredits(): Promise<CreditReadModel[]> {
    if (!this.configured) return [];
    const ids = await this.read("get_credit_ids") as string[];
    return Promise.all(ids.map(async (creditId) => adaptCredit(parseJson<ContractCreditWire>(await this.read("get_credit", [creditId])))));
  }

  async getSnapshot(creditId: string): Promise<DemoSnapshot | null> {
    if (!this.configured) return null;
    const credit = adaptCredit(parseJson<ContractCreditWire>(await this.read("get_credit", [creditId])));
    const info = await this.getContractInfo();
    const requirementsRaw = parseJson<{ items: ContractRequirementWire[] }>(await this.read("get_requirements", [creditId, String(credit.active_version)])).items;
    const requirements = requirementsRaw.map((item) => adaptRequirement(item));
    const presentation = credit.current_presentation_id ? adaptPresentation(parseJson<ContractPresentationWire>(await this.read("get_presentation", [credit.current_presentation_id]))) : undefined;
    const evidence = presentation ? await Promise.all(presentation.evidence_ids.map(async (id) => adaptEvidence(parseJson<ContractEvidenceWire>(await this.read("get_evidence", [id]))))) : [];
    const matrix = presentation ? parseJson<{ items: Array<{ requirement_id: string; resolution_status: RequirementReadModel["resolution_status"]; evidence_id: string; discrepancy_ids: string[]; settlement_eligible: boolean }> }>(await this.read("get_requirement_matrix", [creditId, presentation.presentation_id])).items : [];
    const discrepancyIds = [...new Set(matrix.flatMap((item) => item.discrepancy_ids))];
    const discrepancies: DiscrepancyReadModel[] = await Promise.all(discrepancyIds.map(async (id) => adaptDiscrepancy(parseJson<ContractDiscrepancyWire>(await this.read("get_discrepancy", [id])))));
    const adjudications = await Promise.all(discrepancies.filter((item) => item.status === "VALID_DISCREPANCY" || item.status === "INVALID_DISCREPANCY").map(async (item) => {
      const raw = parseJson<ContractAdjudicationWire>(await this.read("get_adjudication", [item.adjudication_fingerprint ?? item.discrepancy_id]));
      return adaptAdjudication(raw);
    }));
    const auditRaw = parseJson<Array<{ credit_id: string; event_type: string; actor: string; version: string; reference_id: string; occurred_at: string }>>(await this.read("get_audit_events", [creditId]));
    return {
      case_id: creditId,
      case_name: creditId,
      label: "STUDIO-DEV LIVE · canonical readback",
      description: "Live Studio-dev state. No fixture fallback is used when the contract is unavailable.",
      current_time_at: Math.floor(Date.now() / 1000),
      credit,
      requirements: requirements.map((item) => {
        const row = matrix.find((candidate) => candidate.requirement_id === item.requirement_id);
        return { ...item, resolution_status: row?.resolution_status, settlement_eligible: row?.settlement_eligible };
      }),
      evidence,
      presentation: presentation ?? { presentation_id: "", credit_id: creditId, credit_version: credit.active_version, version: 0, submitted_by: "", submitted_at: 0, evidence_ids: [], requirements_root: credit.requirements_root, status: credit.status },
      presentation_history: presentation ? [presentation] : [],
      discrepancies,
      adjudications,
      adjudication: adjudications[0],
      audit: auditRaw.map((event, index) => adaptAuditEvent(event, index + 1)),
      contractInfo: info ?? { protocol: "ClearLC", version: "unknown", ruleset_family: credit.ruleset_id, semantic_scope: "bounded semantic discrepancy", outgoing_gen_transfer_enabled: false, target_network: "studio-dev / chain 61997", provenance: "canonical readback" }
    };
  }

  async performWrite(request: WriteRequest, observer: TransactionObserver = {}): Promise<StoredTransaction> {
    const address = this.ensureConfigured();
    if (!this.walletAddress) throw new Error("WALLET_NOT_CONNECTED");
    const client = createClient({ chain: studioDevnet, account: this.walletAddress as never, provider: typeof window === "undefined" ? undefined : window.ethereum });
    const journal = new BrowserTransactionJournal();
    const call: WriteCall = { address, functionName: request.method, args: request.args, value: request.value, expectedPostcondition: request.expectedPostcondition };
    const result = await submitOnceAndReconcile(client as unknown as StudioDevClientLike, journal, call, observer);
    try {
      const snapshot = request.creditId ? await this.getSnapshot(request.creditId) : null;
      if (request.verify) verifyCanonicalPostcondition(snapshot, request.verify);
    } catch (error) {
      journal.update(result.hash, "STATE_VERIFICATION_FAILED", error instanceof Error ? error.message : "STATE_VERIFICATION_FAILED");
      throw error;
    }
    journal.update(result.hash, "COMPLETE");
    return journal.list().find((item) => item.tx_hash === result.hash) ?? {
      tx_hash: result.hash as StoredTransaction["tx_hash"],
      network: "studio-dev",
      chain_id: 61997,
      contract: address,
      method: request.method,
      credit_id: request.creditId,
      submitted_at: Date.now(),
      expected_postcondition: request.expectedPostcondition,
      phase: "COMPLETE",
      last_observed_at: Date.now()
    };
  }

  async recoverTransactions(): Promise<StoredTransaction[]> {
    const journal = new BrowserTransactionJournal();
    for (const transaction of journal.unresolved()) {
      journal.update(transaction.tx_hash, "RECOVERED");
      try {
        const receipt = await this.readClient.waitForFinalization({ hash: transaction.tx_hash as never });
        await journal.reconcile(transaction.tx_hash, receipt);
      } catch {
        // Recovery never broadcasts. The same hash remains in the journal for a later retry.
      }
    }
    return journal.list();
  }
}
