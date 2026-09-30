import { isSuccessful } from "genlayer-js";
import type { StoredTransaction, TransactionPhase } from "../domain/models";

export const STUDIO_DEV_CHAIN_ID = 61997;
export const STUDIO_DEV_RPC = "https://studio-dev.genlayer.com/api";
export const TRANSACTION_STORAGE_KEY = "clearlc.transaction-journal.v1";

export interface FeeEstimate {
  distribution: unknown;
  feeValue: bigint;
}

export interface WriteCall {
  address: string;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  expectedPostcondition?: string;
}

export interface StudioDevClientLike {
  chain: { id: number; rpcUrls?: { default?: { http?: readonly string[] } } };
  estimateTransactionFeesForWrite(call: WriteCall): Promise<FeeEstimate>;
  writeContract(call: WriteCall & { fees: FeeEstimate }): Promise<string>;
  waitForFinalization(input: { hash: string }): Promise<unknown>;
}

export interface TransactionJournal {
  persistSubmittedHash(hash: string, call: WriteCall, feeValue: bigint): Promise<void>;
  reconcile(hash: string, receipt: unknown): Promise<void>;
}

export interface JournalScope {
  network?: string;
  chain_id?: number;
  contract?: string;
}

export interface TransactionObserver {
  onPhase?: (phase: TransactionPhase) => void;
  onHash?: (hash: string) => void;
}

export function assertStudioDevNetwork(client: StudioDevClientLike): void {
  const rpc = client.chain.rpcUrls?.default?.http?.[0];
  if (client.chain.id !== STUDIO_DEV_CHAIN_ID || rpc !== STUDIO_DEV_RPC) {
    throw new Error("CLEARLC_NETWORK_GUARD_FAILED");
  }
}

export function isStudioDevChain(chainId: number, rpc: string | undefined): boolean {
  return chainId === STUDIO_DEV_CHAIN_ID && rpc === STUDIO_DEV_RPC;
}

export function verifyCanonicalPostcondition<T>(value: T, predicate: (value: T) => boolean): void {
  if (!predicate(value)) throw new Error("STATE_VERIFICATION_FAILED");
}

export class BrowserTransactionJournal implements TransactionJournal {
  private readonly storage: Storage | undefined;
  private readonly scope?: JournalScope;

  constructor(storage: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage, scope?: JournalScope) {
    this.storage = storage;
    this.scope = scope;
  }

  list(): StoredTransaction[] {
    if (!this.storage) return [];
    try {
      const parsed = JSON.parse(this.storage.getItem(TRANSACTION_STORAGE_KEY) ?? "[]") as StoredTransaction[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => this.matchesScope(item));
    } catch {
      return [];
    }
  }

  private matchesScope(item: StoredTransaction): boolean {
    if (!this.scope) return true;
    return (!this.scope.network || item.network === this.scope.network)
      && (!this.scope.chain_id || item.chain_id === this.scope.chain_id)
      && (!this.scope.contract || item.contract.toLowerCase() === this.scope.contract.toLowerCase());
  }

  private all(): StoredTransaction[] {
    if (!this.storage) return [];
    try {
      const parsed = JSON.parse(this.storage.getItem(TRANSACTION_STORAGE_KEY) ?? "[]") as StoredTransaction[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private save(items: StoredTransaction[]): void {
    this.storage?.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(items));
  }

  async persistSubmittedHash(hash: string, call: WriteCall, feeValue: bigint): Promise<void> {
    const record: StoredTransaction = {
      tx_hash: hash as StoredTransaction["tx_hash"],
      network: "studio-dev",
      chain_id: STUDIO_DEV_CHAIN_ID,
      contract: call.address,
      method: call.functionName,
      credit_id: undefined,
      submitted_at: Date.now(),
      expected_postcondition: call.expectedPostcondition ?? call.functionName + " canonical state readback",
      phase: "SUBMITTED",
      last_observed_at: Date.now(),
      error: "protocol fee quoted separately: " + feeValue.toString()
    };
    const next = this.all().filter((item) => item.tx_hash !== hash).concat(record);
    this.save(next);
  }

  async reconcile(hash: string, receipt: unknown): Promise<void> {
    const successful = isSuccessful(receipt as Parameters<typeof isSuccessful>[0]);
    const next = this.all().map((item) => item.tx_hash === hash ? {
      ...item,
      phase: successful ? "FINALIZED" as const : "EXECUTION_FAILED" as const,
      last_observed_at: Date.now(),
      error: successful ? undefined : "EXECUTION_FAILED_AFTER_FINALIZATION"
    } : item);
    this.save(next);
  }

  update(hash: string, phase: TransactionPhase, error?: string): void {
    this.save(this.all().map((item) => item.tx_hash === hash ? { ...item, phase, error, last_observed_at: Date.now() } : item));
  }

  unresolved(): StoredTransaction[] {
    return this.list().filter((item) => !["COMPLETE", "EXECUTION_FAILED", "STATE_VERIFICATION_FAILED"].includes(item.phase));
  }
}

/**
 * PRECONDITION READ -> PREPARE -> SIGNING -> BROADCAST ONCE -> persist hash
 * -> same-hash finality -> execution check. There is no rebroadcast branch.
 */
export async function submitOnceAndReconcile(
  client: StudioDevClientLike,
  journal: TransactionJournal,
  call: WriteCall,
  observer: TransactionObserver = {}
): Promise<{ hash: string; receipt: unknown }> {
  assertStudioDevNetwork(client);
  observer.onPhase?.("PRECONDITION_READ");
  const estimate = await client.estimateTransactionFeesForWrite(call);
  observer.onPhase?.("PREPARED");
  observer.onPhase?.("SIGNING");
  const hash = await client.writeContract({ ...call, fees: estimate });
  await journal.persistSubmittedHash(hash, call, estimate.feeValue);
  observer.onHash?.(hash);
  observer.onPhase?.("SUBMITTED");
  observer.onPhase?.("PENDING");
  const receipt = await client.waitForFinalization({ hash });
  observer.onPhase?.("FINALIZING");
  await journal.reconcile(hash, receipt);
  if (!isSuccessful(receipt as Parameters<typeof isSuccessful>[0])) {
    observer.onPhase?.("EXECUTION_FAILED");
    throw new Error("CLEARLC_EXECUTION_FAILED_AFTER_FINALIZATION");
  }
  observer.onPhase?.("FINALIZED");
  return { hash, receipt };
}
